import '../models/attendance.dart';

abstract class IAttendanceApiService {
  Future<TodayAttendance> getTodayAttendance();
  Future<List<AttendancePunch>> getAttendanceHistory();
  Future<AttendancePunch> recordPunch({
    required PunchAction action,
    required double latitude,
    required double longitude,
    required double accuracyMeters,
    required String selfieBase64,
    required String idempotencyKey,
  });
}

class AttendanceApiException implements Exception {
  final String message;
  final String? code;
  final int? statusCode;

  const AttendanceApiException(this.message, {this.code, this.statusCode});

  @override
  String toString() => message;
}

/// Service handling API communication with the Attendance backend endpoints.
class AttendanceApiService implements IAttendanceApiService {
  TodayAttendance? _mockToday;
  final List<AttendancePunch> _mockHistory = [];
  bool _simulateNetworkError = false;
  String? _lastSubmittedIdempotencyKey;
  int _submitCallCount = 0;

  AttendanceApiService({TodayAttendance? initialToday}) {
    _mockToday = initialToday ??
        const TodayAttendance(
          date: '2026-10-24',
          status: 'NOT_STARTED',
          hasCheckedIn: false,
          hasCheckedOut: false,
          canCheckIn: true,
          canCheckOut: false,
          checkInTime: null,
          checkOutTime: null,
          totalWorkMinutes: 0,
          branchName: 'Headquarters (Market St)',
          branchLatitude: 37.774929,
          branchLongitude: -122.419416,
          geofenceRadiusMeters: 200.0,
          punches: [],
        );
  }

  @override
  Future<TodayAttendance> getTodayAttendance() async {
    if (_simulateNetworkError) {
      throw const AttendanceApiException('Network connection timed out');
    }
    return _mockToday!;
  }

  @override
  Future<List<AttendancePunch>> getAttendanceHistory() async {
    if (_simulateNetworkError) {
      throw const AttendanceApiException('Network connection timed out');
    }
    return List.unmodifiable(_mockHistory);
  }

  @override
  Future<AttendancePunch> recordPunch({
    required PunchAction action,
    required double latitude,
    required double longitude,
    required double accuracyMeters,
    required String selfieBase64,
    required String idempotencyKey,
  }) async {
    _submitCallCount++;
    _lastSubmittedIdempotencyKey = idempotencyKey;

    if (_simulateNetworkError) {
      throw const AttendanceApiException(
        'Upload failed: Server did not respond. Tap Retry to resubmit.',
        code: 'UPLOAD_FAILED',
        statusCode: 504,
      );
    }

    // Check GPS accuracy
    if (accuracyMeters > 50.0) {
      throw const AttendanceApiException(
        'GPS accuracy is too poor (>50m). Please move to an open area and retry.',
        code: 'LOCATION_ACCURACY_TOO_POOR',
        statusCode: 400,
      );
    }

    final now = DateTime.now();
    final punch = AttendancePunch(
      id: 'punch_${now.millisecondsSinceEpoch}',
      action: action,
      serverTimestamp: now,
      latitude: latitude,
      longitude: longitude,
      accuracyMeters: accuracyMeters,
      distanceFromGeofenceMeters: 25.4,
      isWithinGeofence: true,
      verificationOutcome: 'VERIFIED',
      photoUrl: '/api/v1/attendance/photos/sample?token=demo',
      branchName: _mockToday?.branchName ?? 'Headquarters',
    );

    _mockHistory.insert(0, punch);

    // Update today's state
    if (action == PunchAction.checkIn) {
      _mockToday = TodayAttendance(
        date: _mockToday!.date,
        status: 'CHECKED_IN',
        hasCheckedIn: true,
        hasCheckedOut: false,
        canCheckIn: false,
        canCheckOut: true,
        checkInTime: now,
        checkOutTime: null,
        totalWorkMinutes: 0,
        branchName: _mockToday!.branchName,
        branchLatitude: _mockToday!.branchLatitude,
        branchLongitude: _mockToday!.branchLongitude,
        geofenceRadiusMeters: _mockToday!.geofenceRadiusMeters,
        punches: [..._mockToday!.punches, punch],
      );
    } else {
      _mockToday = TodayAttendance(
        date: _mockToday!.date,
        status: 'PRESENT',
        hasCheckedIn: true,
        hasCheckedOut: true,
        canCheckIn: false,
        canCheckOut: false,
        checkInTime: _mockToday!.checkInTime,
        checkOutTime: now,
        totalWorkMinutes: 480,
        branchName: _mockToday!.branchName,
        branchLatitude: _mockToday!.branchLatitude,
        branchLongitude: _mockToday!.branchLongitude,
        geofenceRadiusMeters: _mockToday!.geofenceRadiusMeters,
        punches: [..._mockToday!.punches, punch],
      );
    }

    return punch;
  }

  void setSimulateNetworkError(bool simulate) => _simulateNetworkError = simulate;
  String? get lastSubmittedIdempotencyKey => _lastSubmittedIdempotencyKey;
  int get submitCallCount => _submitCallCount;
}
