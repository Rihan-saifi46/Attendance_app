import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/controllers/attendance_controller.dart';
import 'package:mobile/models/attendance.dart';
import 'package:mobile/screens/attendance_screen.dart';
import 'package:mobile/services/attendance_api_service.dart';
import 'package:mobile/services/camera_service.dart';
import 'package:mobile/services/location_service.dart';

class FakeLocationService implements ILocationService {
  bool permission = true;
  bool gps = true;

  @override
  Future<bool> checkPermission() async => permission;

  @override
  Future<bool> requestPermission() async => permission;

  @override
  Future<bool> isGpsAvailable() async => gps;

  @override
  Future<LocationPayload> getCurrentLocation() async =>
      const LocationPayload(latitude: 37.7749, longitude: -122.4194, accuracyMeters: 15.0);
}

class FakeCameraService implements ICameraService {
  @override
  Future<String> captureAttendanceSelfie() async => 'data:image/jpeg;base64,fakeselfie';
}

class FakeAttendanceApiService implements IAttendanceApiService {
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
  bool failNextPunch = false;

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
    if (failNextPunch) {
      throw const AttendanceApiException('Simulated network timeout', statusCode: 408);
    }

    final punch = AttendancePunch(
      id: 'p_1',
      action: action,
      serverTimestamp: DateTime(2026, 10, 24, 9, 30),
      latitude: latitude,
      longitude: longitude,
      accuracyMeters: accuracyMeters,
      distanceFromGeofenceMeters: 14.2,
      isWithinGeofence: true,
      verificationOutcome: 'VERIFIED',
      photoUrl: 'https://workforcepro.local/api/v1/attendance/photos/key_1?token=mock',
      branchName: 'San Francisco HQ',
    );

    today = TodayAttendance(
      date: '2026-10-24',
      status: 'CHECKED_IN',
      hasCheckedIn: true,
      hasCheckedOut: false,
      canCheckIn: false,
      canCheckOut: true,
      checkInTime: punch.serverTimestamp,
      checkOutTime: null,
      totalWorkMinutes: 0,
      branchName: 'San Francisco HQ',
      branchLatitude: 37.7749,
      branchLongitude: -122.4194,
      geofenceRadiusMeters: 200.0,
      punches: [punch],
    );
    history.insert(0, punch);
    return punch;
  }
}

void main() {
  late FakeLocationService locationService;
  late FakeCameraService cameraService;
  late FakeAttendanceApiService apiService;
  late AttendanceController controller;

  setUp(() {
    locationService = FakeLocationService();
    cameraService = FakeCameraService();
    apiService = FakeAttendanceApiService();
    controller = AttendanceController(
      locationService: locationService,
      cameraService: cameraService,
      apiService: apiService,
    );
  });

  Widget buildTestApp(AttendanceController c) {
    return MaterialApp(
      home: AttendanceScreen(controller: c),
    );
  }

  group('AttendanceScreen Widget Tests', () {
    testWidgets('renders basic layout with today card and privacy notice', (WidgetTester tester) async {
      await controller.loadInitialData();
      await tester.pumpWidget(buildTestApp(controller));

      expect(find.text('WorkforcePro Attendance'), findsOneWidget);
      expect(find.text('GPS & Camera Selfie Verification'), findsOneWidget);
      expect(find.text('Not Checked In'), findsOneWidget);
      expect(find.text('Check In'), findsWidgets);
      expect(find.text('Check Out'), findsWidgets);
      expect(find.textContaining('continuous background location tracking'), findsOneWidget);
    });

    testWidgets('displays Permission Denied banner and triggers grant action', (WidgetTester tester) async {
      locationService.permission = false;
      await controller.loadInitialData();
      await tester.pumpWidget(buildTestApp(controller));

      // Attempt Check In -> triggers permission check
      await tester.tap(find.widgetWithText(ElevatedButton, 'Check In'));
      await tester.pumpAndSettle();

      expect(find.text('Location Permission Denied'), findsOneWidget);
      expect(find.text('Grant Location Permission'), findsOneWidget);

      // User grants permission on prompt, then taps Grant Location Permission
      locationService.permission = true;
      await tester.tap(find.text('Grant Location Permission'));
      await tester.pumpAndSettle();

      expect(find.text('Location Permission Denied'), findsNothing);
      expect(find.text('Attendance punch verified and recorded by server!'), findsOneWidget);
    });

    testWidgets('displays GPS Unavailable banner when location services disabled', (WidgetTester tester) async {
      locationService.gps = false;
      await controller.loadInitialData();
      await tester.pumpWidget(buildTestApp(controller));

      await tester.tap(find.widgetWithText(ElevatedButton, 'Check In'));
      await tester.pumpAndSettle();

      expect(find.text('Location (GPS) Unavailable'), findsOneWidget);
      expect(find.text('Retry Satellite Fix'), findsOneWidget);
    });

    testWidgets('displays Upload Failed banner with duplicate-safe retry button', (WidgetTester tester) async {
      apiService.failNextPunch = true;
      await controller.loadInitialData();
      await tester.pumpWidget(buildTestApp(controller));

      await tester.tap(find.widgetWithText(ElevatedButton, 'Check In'));
      await tester.pumpAndSettle();

      expect(find.text('Upload Failed'), findsOneWidget);
      expect(find.text('Retry Punch (Duplicate-Safe)'), findsOneWidget);
      expect(find.textContaining('Simulated network timeout'), findsOneWidget);

      // Now recover and tap retry
      apiService.failNextPunch = false;
      await tester.tap(find.text('Retry Punch (Duplicate-Safe)'));
      await tester.pumpAndSettle();

      expect(find.text('Upload Failed'), findsNothing);
      expect(find.text('Attendance punch verified and recorded by server!'), findsOneWidget);
    });

    testWidgets('renders attendance history list item when punches exist', (WidgetTester tester) async {
      apiService.history.add(AttendancePunch(
        id: 'hist_1',
        action: PunchAction.checkIn,
        serverTimestamp: DateTime(2026, 10, 24, 9, 0),
        latitude: 37.7749,
        longitude: -122.4194,
        accuracyMeters: 8.5,
        distanceFromGeofenceMeters: 12.0,
        isWithinGeofence: true,
        verificationOutcome: 'VERIFIED',
        photoUrl: 'https://workforcepro.local/api/v1/attendance/photos/photo_abc?token=mock',
        branchName: 'San Francisco HQ',
      ));

      await controller.loadInitialData();
      await tester.pumpWidget(buildTestApp(controller));

      expect(find.text('Recent Attendance History'), findsOneWidget);
      expect(find.text('Verified'), findsOneWidget);
      expect(find.textContaining('GPS Accuracy: ±8.5m'), findsOneWidget);
    });
  });
}
