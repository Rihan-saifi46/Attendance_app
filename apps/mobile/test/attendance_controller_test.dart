import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/controllers/attendance_controller.dart';
import 'package:mobile/models/attendance.dart';
import 'package:mobile/services/attendance_api_service.dart';
import 'package:mobile/services/camera_service.dart';
import 'package:mobile/services/location_service.dart';

class MockLocationService implements ILocationService {
  bool permissionGranted = true;
  bool gpsEnabled = true;
  LocationPayload location = const LocationPayload(
    latitude: 37.7749,
    longitude: -122.4194,
    accuracyMeters: 12.5,
  );

  @override
  Future<bool> checkPermission() async => permissionGranted;

  @override
  Future<bool> requestPermission() async => permissionGranted;

  @override
  Future<bool> isGpsAvailable() async => gpsEnabled;

  @override
  Future<LocationPayload> getCurrentLocation() async => location;
}

class MockCameraService implements ICameraService {
  bool shouldFail = false;
  String selfiePayload = 'data:image/jpeg;base64,mockselfiedata';

  @override
  Future<String> captureAttendanceSelfie() async {
    if (shouldFail) {
      throw Exception('Camera device busy');
    }
    return selfiePayload;
  }
}

class MockAttendanceApiService implements IAttendanceApiService {
  TodayAttendance today = const TodayAttendance(
    date: '2026-10-24',
    status: 'NOT_STARTED',
    hasCheckedIn: false,
    hasCheckedOut: false,
    canCheckIn: true,
    canCheckOut: false,
    checkInTime: null,
    checkOutTime: null,
    totalWorkMinutes: 0,
    branchName: 'San Francisco HQ',
    branchLatitude: 37.7749,
    branchLongitude: -122.4194,
    geofenceRadiusMeters: 200.0,
    punches: [],
  );
  List<AttendancePunch> history = [];
  bool shouldThrow = false;
  String? lastIdempotencyKey;
  int recordPunchCalls = 0;

  @override
  Future<TodayAttendance> getTodayAttendance() async => today;

  @override
  Future<List<AttendancePunch>> getAttendanceHistory() async => history;

  @override
  Future<AttendancePunch> recordPunch({
    required PunchAction action,
    required double latitude,
    required double longitude,
    required double accuracyMeters,
    required String selfieBase64,
    required String idempotencyKey,
  }) async {
    recordPunchCalls++;
    lastIdempotencyKey = idempotencyKey;

    if (shouldThrow) {
      throw const AttendanceApiException('Network connection error', statusCode: 503);
    }

    final punch = AttendancePunch(
      id: 'punch_1',
      action: action,
      serverTimestamp: DateTime.now(),
      latitude: latitude,
      longitude: longitude,
      accuracyMeters: accuracyMeters,
      distanceFromGeofenceMeters: 10.0,
      isWithinGeofence: true,
      verificationOutcome: 'VERIFIED',
      photoUrl: 'https://workforcepro.local/api/v1/attendance/photos/selfie_key_1?token=mock',
      branchName: 'San Francisco HQ',
    );

    if (action == PunchAction.checkIn) {
      today = TodayAttendance(
        date: today.date,
        status: 'CHECKED_IN',
        hasCheckedIn: true,
        hasCheckedOut: false,
        canCheckIn: false,
        canCheckOut: true,
        checkInTime: punch.serverTimestamp,
        checkOutTime: null,
        totalWorkMinutes: 0,
        branchName: today.branchName,
        branchLatitude: today.branchLatitude,
        branchLongitude: today.branchLongitude,
        geofenceRadiusMeters: today.geofenceRadiusMeters,
        punches: [punch],
      );
    } else {
      today = TodayAttendance(
        date: today.date,
        status: 'PRESENT',
        hasCheckedIn: true,
        hasCheckedOut: true,
        canCheckIn: false,
        canCheckOut: false,
        checkInTime: today.checkInTime,
        checkOutTime: punch.serverTimestamp,
        totalWorkMinutes: 480,
        branchName: today.branchName,
        branchLatitude: today.branchLatitude,
        branchLongitude: today.branchLongitude,
        geofenceRadiusMeters: today.geofenceRadiusMeters,
        punches: [...today.punches, punch],
      );
    }

    history.insert(0, punch);
    return punch;
  }
}

void main() {
  late MockLocationService locationService;
  late MockCameraService cameraService;
  late MockAttendanceApiService apiService;
  late AttendanceController controller;

  setUp(() {
    locationService = MockLocationService();
    cameraService = MockCameraService();
    apiService = MockAttendanceApiService();
    controller = AttendanceController(
      locationService: locationService,
      cameraService: cameraService,
      apiService: apiService,
    );
  });

  group('AttendanceController Unit Tests', () {
    test('loads initial attendance and history successfully', () async {
      await controller.loadInitialData();

      expect(controller.todayAttendance, isNotNull);
      expect(controller.todayAttendance!.status, equals('NOT_STARTED'));
      expect(controller.todayAttendance!.canCheckIn, isTrue);
      expect(controller.history, isEmpty);
      expect(controller.state, equals(AttendanceUiState.idle));
    });

    test('sets permissionDenied state when location permission is absent', () async {
      locationService.permissionGranted = false;

      await controller.initiatePunch(PunchAction.checkIn);

      expect(controller.state, equals(AttendanceUiState.permissionDenied));
      expect(controller.errorMessage, contains('Location permission is required'));
    });

    test('allows retrying permission and recovers seamlessly', () async {
      locationService.permissionGranted = false;
      await controller.initiatePunch(PunchAction.checkIn);
      expect(controller.state, equals(AttendanceUiState.permissionDenied));

      // User grants permission via prompt
      locationService.permissionGranted = true;
      await controller.retryPermission();

      expect(locationService.permissionGranted, isTrue);
      expect(controller.state, equals(AttendanceUiState.success));
      expect(controller.todayAttendance!.hasCheckedIn, isTrue);
    });

    test('sets gpsUnavailable state when device GPS is disabled', () async {
      locationService.gpsEnabled = false;

      await controller.initiatePunch(PunchAction.checkIn);

      expect(controller.state, equals(AttendanceUiState.gpsUnavailable));
      expect(controller.errorMessage, contains('currently disabled'));
    });

    test('sets uploadFailed on network error and PRESERVES idempotencyKey on retry', () async {
      apiService.shouldThrow = true;

      await controller.initiatePunch(PunchAction.checkIn);

      expect(controller.state, equals(AttendanceUiState.uploadFailed));
      expect(controller.errorMessage, contains('Network connection error'));
      expect(apiService.recordPunchCalls, equals(1));

      final originalKey = controller.activeIdempotencyKey;
      expect(originalKey, isNotNull);
      expect(apiService.lastIdempotencyKey, equals(originalKey));
      expect(controller.activeIdempotencyKey, equals(originalKey));

      // User hits Retry Punch without creating duplicate
      apiService.shouldThrow = false;
      await controller.retryPunch();

      expect(apiService.recordPunchCalls, equals(2));
      // CRITICAL: Must use the exact same idempotency key to prevent double punch
      expect(apiService.lastIdempotencyKey, equals(originalKey));
      expect(controller.state, equals(AttendanceUiState.success));
      expect(controller.todayAttendance!.hasCheckedIn, isTrue);
    });

    test('completes successful check-in and check-out lifecycle', () async {
      // 1. Check in
      await controller.initiatePunch(PunchAction.checkIn);
      expect(controller.state, equals(AttendanceUiState.success));
      expect(controller.todayAttendance!.status, equals('CHECKED_IN'));
      expect(controller.todayAttendance!.canCheckIn, isFalse);
      expect(controller.todayAttendance!.canCheckOut, isTrue);
      expect(controller.history.length, equals(1));
      expect(controller.history.first.action, equals(PunchAction.checkIn));

      // 2. Check out
      await controller.initiatePunch(PunchAction.checkOut);
      expect(controller.state, equals(AttendanceUiState.success));
      expect(controller.todayAttendance!.status, equals('PRESENT'));
      expect(controller.todayAttendance!.canCheckIn, isFalse);
      expect(controller.todayAttendance!.canCheckOut, isFalse);
      expect(controller.history.length, equals(2));
      expect(controller.history.first.action, equals(PunchAction.checkOut));
    });

    test('handles camera hardware failure gracefully', () async {
      cameraService.shouldFail = true;

      await controller.initiatePunch(PunchAction.checkIn);

      expect(controller.state, equals(AttendanceUiState.uploadFailed));
      expect(controller.errorMessage, contains('Camera device busy'));
    });
  });
}
