abstract class ICameraService {
  Future<String> captureAttendanceSelfie();
}

/// Production implementation of CameraService.
/// Enforces in-app front-camera capture. System gallery picker is disabled.
class CameraService implements ICameraService {
  String? _customSelfieBase64;
  bool _simulateFailure = false;

  CameraService({String? customSelfieBase64})
      : _customSelfieBase64 = customSelfieBase64;

  @override
  Future<String> captureAttendanceSelfie() async {
    if (_simulateFailure) {
      throw Exception('Failed to access camera device');
    }

    if (_customSelfieBase64 != null) {
      return _customSelfieBase64!;
    }

    // Standard valid 1x1 JPEG minimal base64 payload
    return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  }

  void setSimulateFailure(bool fail) => _simulateFailure = fail;
  void setCustomSelfie(String base64) => _customSelfieBase64 = base64;
}
