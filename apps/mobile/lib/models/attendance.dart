enum PunchAction { checkIn, checkOut }

enum AttendanceUiState {
  idle,
  requestingPermission,
  permissionDenied,
  gpsUnavailable,
  capturingLocation,
  capturingSelfie,
  submitting,
  success,
  uploadFailed
}

class LocationPayload {
  final double latitude;
  final double longitude;
  final double accuracyMeters;

  const LocationPayload({
    required this.latitude,
    required this.longitude,
    required this.accuracyMeters,
  });

  @override
  String toString() =>
      'Lat: ${latitude.toStringAsFixed(4)}, Lon: ${longitude.toStringAsFixed(4)} (±${accuracyMeters.toStringAsFixed(1)}m)';
}

class AttendancePunch {
  final String id;
  final PunchAction action;
  final DateTime serverTimestamp;
  final double latitude;
  final double longitude;
  final double accuracyMeters;
  final double distanceFromGeofenceMeters;
  final bool isWithinGeofence;
  final String verificationOutcome;
  final String? photoUrl;
  final String branchName;

  const AttendancePunch({
    required this.id,
    required this.action,
    required this.serverTimestamp,
    required this.latitude,
    required this.longitude,
    required this.accuracyMeters,
    required this.distanceFromGeofenceMeters,
    required this.isWithinGeofence,
    required this.verificationOutcome,
    this.photoUrl,
    required this.branchName,
  });

  factory AttendancePunch.fromJson(Map<String, dynamic> json) {
    final actionStr = json['action'] as String? ?? 'CHECK_IN';
    final coords = json['coordinates'] as Map<String, dynamic>? ?? {};

    return AttendancePunch(
      id: json['id'] as String? ?? '',
      action: actionStr == 'CHECK_OUT' ? PunchAction.checkOut : PunchAction.checkIn,
      serverTimestamp: DateTime.tryParse(json['serverTimestamp'] as String? ?? '') ?? DateTime.now(),
      latitude: (coords['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (coords['longitude'] as num?)?.toDouble() ?? 0.0,
      accuracyMeters: (coords['accuracyMeters'] as num?)?.toDouble() ?? 0.0,
      distanceFromGeofenceMeters: (json['distanceFromGeofenceMeters'] as num?)?.toDouble() ?? 0.0,
      isWithinGeofence: json['isWithinGeofence'] as bool? ?? false,
      verificationOutcome: json['verificationOutcome'] as String? ?? 'VERIFIED',
      photoUrl: json['authorizedPhotoUrl'] as String?,
      branchName: json['branchName'] as String? ?? 'Branch Office',
    );
  }
}

class TodayAttendance {
  final String date;
  final String status;
  final bool hasCheckedIn;
  final bool hasCheckedOut;
  final bool canCheckIn;
  final bool canCheckOut;
  final DateTime? checkInTime;
  final DateTime? checkOutTime;
  final int totalWorkMinutes;
  final String branchName;
  final double branchLatitude;
  final double branchLongitude;
  final double geofenceRadiusMeters;
  final List<AttendancePunch> punches;

  const TodayAttendance({
    required this.date,
    required this.status,
    required this.hasCheckedIn,
    required this.hasCheckedOut,
    required this.canCheckIn,
    required this.canCheckOut,
    this.checkInTime,
    this.checkOutTime,
    required this.totalWorkMinutes,
    required this.branchName,
    required this.branchLatitude,
    required this.branchLongitude,
    required this.geofenceRadiusMeters,
    required this.punches,
  });

  factory TodayAttendance.fromJson(Map<String, dynamic> json) {
    final punchesList = (json['punches'] as List<dynamic>? ?? [])
        .map((p) => AttendancePunch.fromJson(p as Map<String, dynamic>))
        .toList();

    final branch = json['assignedBranch'] as Map<String, dynamic>? ?? {};

    return TodayAttendance(
      date: json['date'] as String? ?? '',
      status: json['status'] as String? ?? 'NOT_STARTED',
      hasCheckedIn: json['hasCheckedIn'] as bool? ?? false,
      hasCheckedOut: json['hasCheckedOut'] as bool? ?? false,
      canCheckIn: json['canCheckIn'] as bool? ?? true,
      canCheckOut: json['canCheckOut'] as bool? ?? false,
      checkInTime: json['checkInTime'] != null
          ? DateTime.tryParse(json['checkInTime'] as String)
          : null,
      checkOutTime: json['checkOutTime'] != null
          ? DateTime.tryParse(json['checkOutTime'] as String)
          : null,
      totalWorkMinutes: json['totalWorkMinutes'] as int? ?? 0,
      branchName: branch['name'] as String? ?? 'Main Branch',
      branchLatitude: (branch['latitude'] as num?)?.toDouble() ?? 37.7749,
      branchLongitude: (branch['longitude'] as num?)?.toDouble() ?? -122.4194,
      geofenceRadiusMeters: (branch['geofenceRadiusMeters'] as num?)?.toDouble() ?? 200.0,
      punches: punchesList,
    );
  }
}
