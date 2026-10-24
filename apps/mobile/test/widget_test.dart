import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/controllers/attendance_controller.dart';
import 'package:mobile/main.dart';
import 'package:mobile/services/attendance_api_service.dart';
import 'package:mobile/services/camera_service.dart';
import 'package:mobile/services/location_service.dart';

void main() {
  testWidgets('WorkforceProApp renders AttendanceScreen with GPS and Selfie Verification', (WidgetTester tester) async {
    final locationService = LocationService();
    final cameraService = CameraService();
    final apiService = AttendanceApiService();
    final attendanceController = AttendanceController(
      locationService: locationService,
      cameraService: cameraService,
      apiService: apiService,
    );

    await tester.pumpWidget(WorkforceProApp(attendanceController: attendanceController));
    await tester.pumpAndSettle();

    expect(find.text('WorkforcePro Attendance'), findsOneWidget);
    expect(find.text('GPS & Camera Selfie Verification'), findsOneWidget);
    expect(find.text('Check In'), findsWidgets);
    expect(find.text('Check Out'), findsWidgets);
  });
}
