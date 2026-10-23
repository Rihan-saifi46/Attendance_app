import 'package:flutter/material.dart';

void main() {
  runApp(const WorkforceProApp());
}

class WorkforceProApp extends StatelessWidget {
  const WorkforceProApp({super.key});

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
      home: const MobileFoundationScreen(),
    );
  }
}

class MobileFoundationScreen extends StatelessWidget {
  const MobileFoundationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'WorkforcePro',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(16.0),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(12.0),
                  border: Border.all(color: Colors.white10),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Row(
                      children: [
                        Icon(Icons.check_circle_outline, color: Color(0xFF10B981)),
                        SizedBox(width: 8),
                        Text(
                          'Phase 1 Baseline Active',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF34D399),
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 12),
                    Text(
                      'WorkforcePro Mobile Client initialized.\nReady for Phase 6 field attendance and selfie implementation.',
                      style: TextStyle(color: Color(0xFF94A3B8), height: 1.5),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Architecture Components Ready:',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 12),
              _buildFeatureTile(Icons.security, 'Hardware Device Binding Gateway'),
              _buildFeatureTile(Icons.location_on_outlined, 'Anti-Spoofing GPS Validator'),
              _buildFeatureTile(Icons.camera_alt_outlined, 'Liveness Camera Frame Pipeline'),
            ],
          ),
        ),
      ),
    );
  }

  static Widget _buildFeatureTile(IconData icon, String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        children: [
          Icon(icon, size: 20, color: const Color(0xFF3B82F6)),
          const SizedBox(width: 12),
          Text(title, style: const TextStyle(color: Color(0xFFCBD5E1))),
        ],
      ),
    );
  }
}
