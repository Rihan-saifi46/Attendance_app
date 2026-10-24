import 'package:flutter/material.dart';
import 'services/location_service.dart';
import 'services/camera_service.dart';
import 'services/attendance_api_service.dart';
import 'controllers/attendance_controller.dart';
import 'screens/attendance_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  final locationService = LocationService();
  final cameraService = CameraService();
  final apiService = AttendanceApiService();
  final attendanceController = AttendanceController(
    locationService: locationService,
    cameraService: cameraService,
    apiService: apiService,
  );

  runApp(WorkforceProApp(attendanceController: attendanceController));
}

class WorkforceProApp extends StatefulWidget {
  final AttendanceController attendanceController;

  const WorkforceProApp({super.key, required this.attendanceController});

  @override
  State<WorkforceProApp> createState() => _WorkforceProAppState();
}

class _WorkforceProAppState extends State<WorkforceProApp> {
  @override
  void initState() {
    super.initState();
    widget.attendanceController.loadInitialData();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'WorkforcePro',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF3B82F6),
          secondary: Color(0xFF8B5CF6),
          surface: Color(0xFF1E293B),
        ),
        useMaterial3: true,
      ),
      home: AttendanceScreen(controller: widget.attendanceController),
    );
  }
}
