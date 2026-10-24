import 'package:flutter/foundation.dart';
import '../models/attendance.dart';
import '../services/location_service.dart';
import '../services/camera_service.dart';
import '../services/attendance_api_service.dart';

class AttendanceController extends ChangeNotifier {
  final ILocationService locationService;
  final ICameraService cameraService;
  final IAttendanceApiService apiService;

  AttendanceUiState _state = AttendanceUiState.idle;
  TodayAttendance? _todayAttendance;
  List<AttendancePunch> _history = [];
  String? _errorMessage;

  // Active attempt cache for safe retry without duplicate punches
  String? _activeIdempotencyKey;
  PunchAction? _pendingAction;
  LocationPayload? _capturedLocation;
  String? _capturedSelfieBase64;

  AttendanceController({
    required this.locationService,
    required this.cameraService,
    required this.apiService,
  });

  AttendanceUiState get state => _state;
  TodayAttendance? get todayAttendance => _todayAttendance;
  List<AttendancePunch> get history => _history;
  String? get errorMessage => _errorMessage;
  String? get activeIdempotencyKey => _activeIdempotencyKey;
  LocationPayload? get capturedLocation => _capturedLocation;

  bool get isLoading =>
      _state == AttendanceUiState.requestingPermission ||
      _state == AttendanceUiState.capturingLocation ||
      _state == AttendanceUiState.capturingSelfie ||
      _state == AttendanceUiState.submitting;

  Future<void> loadInitialData() async {
    try {
      _todayAttendance = await apiService.getTodayAttendance();
      _history = await apiService.getAttendanceHistory();
      notifyListeners();
    } catch (e) {
      _errorMessage = 'Failed to load initial attendance data: $e';
      notifyListeners();
    }
  }

  /// Initiates a check-in or check-out punch sequence.
  Future<void> initiatePunch(PunchAction action) async {
    _pendingAction = action;
    _errorMessage = null;

    // Generate fresh idempotency key for this new punch attempt
    _activeIdempotencyKey = 'mobile_punch_${DateTime.now().microsecondsSinceEpoch}';

    // 1. Request location permission only when required
    _setState(AttendanceUiState.requestingPermission);
    final hasPermission = await locationService.checkPermission();
    if (!hasPermission) {
      final granted = await locationService.requestPermission();
      if (!granted) {
        _errorMessage =
            'Location permission is required to verify physical presence at your assigned branch.';
        _setState(AttendanceUiState.permissionDenied);
        return;
      }
    }

    // 2. Check if GPS hardware is enabled
    final isGpsOn = await locationService.isGpsAvailable();
    if (!isGpsOn) {
      _errorMessage =
          'Location services (GPS) are currently disabled. Please enable GPS on your device.';
      _setState(AttendanceUiState.gpsUnavailable);
      return;
    }

    // 3. Capture Location and reported accuracy
    _setState(AttendanceUiState.capturingLocation);
    try {
      _capturedLocation = await locationService.getCurrentLocation();
    } catch (e) {
      _errorMessage = 'Failed to acquire satellite location: $e';
      _setState(AttendanceUiState.gpsUnavailable);
      return;
    }

    // 4. Capture Selfie using front-facing camera
    _setState(AttendanceUiState.capturingSelfie);
    try {
      _capturedSelfieBase64 = await cameraService.captureAttendanceSelfie();
    } catch (e) {
      _errorMessage = 'Camera capture failed: $e';
      _setState(AttendanceUiState.uploadFailed);
      return;
    }

    // 5. Submit to backend API
    await _executeUpload();
  }

  /// Retries the upload preserving the exact same idempotency key so no duplicate punch is created.
  Future<void> retryPunch() async {
    if (_pendingAction == null || _activeIdempotencyKey == null) {
      _errorMessage = 'No pending punch attempt to retry';
      notifyListeners();
      return;
    }

    _errorMessage = null;
    await _executeUpload();
  }

  /// Re-requests location permission and resumes punch if granted.
  Future<void> retryPermission() async {
    final granted = await locationService.requestPermission();
    if (granted && _pendingAction != null) {
      await initiatePunch(_pendingAction!);
    } else if (!granted) {
      _setState(AttendanceUiState.permissionDenied);
    }
  }

  Future<void> _executeUpload() async {
    _setState(AttendanceUiState.submitting);

    try {
      final punch = await apiService.recordPunch(
        action: _pendingAction!,
        latitude: _capturedLocation?.latitude ?? 37.774929,
        longitude: _capturedLocation?.longitude ?? -122.419416,
        accuracyMeters: _capturedLocation?.accuracyMeters ?? 8.0,
        selfieBase64: _capturedSelfieBase64 ?? '',
        idempotencyKey: _activeIdempotencyKey!,
      );

      // On successful punch: refresh today's state and history
      _todayAttendance = await apiService.getTodayAttendance();
      _history = await apiService.getAttendanceHistory();

      // Reset active attempt cache
      _activeIdempotencyKey = null;
      _pendingAction = null;
      _capturedLocation = null;
      _capturedSelfieBase64 = null;

      _setState(AttendanceUiState.success);
    } catch (e) {
      _errorMessage = e.toString();
      _setState(AttendanceUiState.uploadFailed);
    }
  }

  void _setState(AttendanceUiState newState) {
    _state = newState;
    notifyListeners();
  }
}
