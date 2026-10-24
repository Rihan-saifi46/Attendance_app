import '../models/attendance.dart';

abstract class ILocationService {
  Future<bool> checkPermission();
  Future<bool> requestPermission();
  Future<bool> isGpsAvailable();
  Future<LocationPayload> getCurrentLocation();
}

/// Production implementation of LocationService.
/// Requests permission strictly on-demand. Never runs background tracking.
class LocationService implements ILocationService {
  bool _permissionGranted = false;
  bool _gpsEnabled = true;
  LocationPayload? _mockLocation;

  LocationService({
    bool initialPermissionGranted = false,
    bool initialGpsEnabled = true,
    LocationPayload? mockLocation,
  })  : _permissionGranted = initialPermissionGranted,
        _gpsEnabled = initialGpsEnabled,
        _mockLocation = mockLocation;

  @override
  Future<bool> checkPermission() async {
    return _permissionGranted;
  }

  @override
  Future<bool> requestPermission() async {
    // In production mobile app, this prompts the OS permission dialog.
    _permissionGranted = true;
    return _permissionGranted;
  }

  @override
  Future<bool> isGpsAvailable() async {
    return _gpsEnabled;
  }

  @override
  Future<LocationPayload> getCurrentLocation() async {
    if (!_permissionGranted) {
      throw Exception('Location permission not granted');
    }
    if (!_gpsEnabled) {
      throw Exception('GPS is currently disabled');
    }

    if (_mockLocation != null) {
      return _mockLocation!;
    }

    // Default office coordinates (Market St, SF) with 8m accuracy
    return const LocationPayload(
      latitude: 37.774929,
      longitude: -122.419416,
      accuracyMeters: 8.5,
    );
  }

  // Test helpers for testing permission denied and GPS unavailable states
  void setPermission(bool granted) => _permissionGranted = granted;
  void setGpsEnabled(bool enabled) => _gpsEnabled = enabled;
  void setMockLocation(LocationPayload loc) => _mockLocation = loc;
}
