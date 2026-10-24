import 'package:flutter/material.dart';
import '../models/attendance.dart';
import '../controllers/attendance_controller.dart';

class AttendanceScreen extends StatelessWidget {
  final AttendanceController controller;

  const AttendanceScreen({super.key, required this.controller});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        final today = controller.todayAttendance;
        final state = controller.state;

        return Scaffold(
          backgroundColor: const Color(0xFF0F172A),
          appBar: AppBar(
            backgroundColor: const Color(0xFF1E293B),
            elevation: 0,
            title: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'WorkforcePro Attendance',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                Text(
                  'GPS & Camera Selfie Verification',
                  style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                ),
              ],
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh, color: Color(0xFF94A3B8)),
                onPressed: controller.isLoading ? null : () => controller.loadInitialData(),
                tooltip: 'Refresh Attendance Data',
              ),
            ],
          ),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _buildTodayStatusCard(today),
                  const SizedBox(height: 16),
                  _buildStateBanner(context, state),
                  const SizedBox(height: 16),
                  _buildActionButtons(today, state),
                  const SizedBox(height: 24),
                  _buildHistorySection(controller.history),
                  const SizedBox(height: 16),
                  _buildPrivacyNotice(),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildTodayStatusCard(TodayAttendance? today) {
    final status = today?.status ?? 'NOT_STARTED';
    Color statusColor;
    String statusLabel;

    switch (status) {
      case 'CHECKED_IN':
        statusColor = const Color(0xFF3B82F6);
        statusLabel = 'Checked In';
        break;
      case 'PRESENT':
        statusColor = const Color(0xFF10B981);
        statusLabel = 'Present (Full Day)';
        break;
      case 'HALF_DAY':
        statusColor = const Color(0xFFF59E0B);
        statusLabel = 'Half Day';
        break;
      case 'LATE':
        statusColor = const Color(0xFFEF4444);
        statusLabel = 'Late Punch-In';
        break;
      default:
        statusColor = const Color(0xFF64748B);
        statusLabel = 'Not Checked In';
    }

    final inTimeStr = today?.checkInTime != null
        ? '${today!.checkInTime!.toLocal().hour.toString().padLeft(2, '0')}:${today.checkInTime!.toLocal().minute.toString().padLeft(2, '0')}'
        : '--:--';

    final outTimeStr = today?.checkOutTime != null
        ? '${today!.checkOutTime!.toLocal().hour.toString().padLeft(2, '0')}:${today.checkOutTime!.toLocal().minute.toString().padLeft(2, '0')}'
        : '--:--';

    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Today, ${today?.date ?? '2026-10-24'}',
                style: const TextStyle(
                  fontSize: 14,
                  color: Color(0xFF94A3B8),
                  fontWeight: FontWeight.w500,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: statusColor.withOpacity(0.4)),
                ),
                child: Text(
                  statusLabel,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: statusColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildTimeMetric(
                  icon: Icons.login_rounded,
                  label: 'Check In',
                  time: inTimeStr,
                  color: const Color(0xFF10B981),
                ),
              ),
              Container(width: 1, height: 40, color: Colors.white10),
              Expanded(
                child: _buildTimeMetric(
                  icon: Icons.logout_rounded,
                  label: 'Check Out',
                  time: outTimeStr,
                  color: const Color(0xFFF59E0B),
                ),
              ),
              Container(width: 1, height: 40, color: Colors.white10),
              Expanded(
                child: _buildTimeMetric(
                  icon: Icons.timer_outlined,
                  label: 'Work Duration',
                  time: '${(today?.totalWorkMinutes ?? 0) ~/ 60}h ${(today?.totalWorkMinutes ?? 0) % 60}m',
                  color: const Color(0xFF60A5FA),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(color: Colors.white10),
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(Icons.location_city_outlined, size: 16, color: Color(0xFF94A3B8)),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Assigned Branch: ${today?.branchName ?? 'Headquarters'} (Geofence: ${today?.geofenceRadiusMeters.toInt() ?? 200}m)',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTimeMetric({
    required IconData icon,
    required String label,
    required String time,
    required Color color,
  }) {
    return Column(
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
        ),
        const SizedBox(height: 2),
        Text(
          time,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
      ],
    );
  }

  Widget _buildStateBanner(BuildContext context, AttendanceUiState state) {
    if (state == AttendanceUiState.idle) {
      return const SizedBox.shrink();
    }

    if (controller.isLoading) {
      String loadingText = 'Processing Attendance...';
      if (state == AttendanceUiState.requestingPermission) {
        loadingText = 'Checking Location Permission...';
      } else if (state == AttendanceUiState.capturingLocation) {
        loadingText = 'Acquiring GPS Satellite Fix...';
      } else if (state == AttendanceUiState.capturingSelfie) {
        loadingText = 'Capturing Front-Camera Selfie...';
      } else if (state == AttendanceUiState.submitting) {
        loadingText = 'Verifying Coordinates & Selfie with Server...';
      }

      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF3B82F6).withOpacity(0.3)),
        ),
        child: Row(
          children: [
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2.5,
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF3B82F6)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                loadingText,
                style: const TextStyle(color: Colors.white, fontSize: 13),
              ),
            ),
          ],
        ),
      );
    }

    if (state == AttendanceUiState.permissionDenied) {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF7F1D1D).withOpacity(0.4),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFEF4444)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.location_off, color: Color(0xFFEF4444), size: 18),
                SizedBox(width: 8),
                Text(
                  'Location Permission Denied',
                  style: TextStyle(
                    color: Color(0xFFFCA5A5),
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              controller.errorMessage ??
                  'WorkforcePro requires location permission to verify your presence within the office geofence.',
              style: const TextStyle(color: Color(0xFFE2E8F0), fontSize: 12),
            ),
            const SizedBox(height: 10),
            ElevatedButton(
              onPressed: () => controller.retryPermission(),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFEF4444),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              ),
              child: const Text('Grant Location Permission'),
            ),
          ],
        ),
      );
    }

    if (state == AttendanceUiState.gpsUnavailable) {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF78350F).withOpacity(0.4),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFF59E0B)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.gps_off_rounded, color: Color(0xFFF59E0B), size: 18),
                SizedBox(width: 8),
                Text(
                  'Location (GPS) Unavailable',
                  style: TextStyle(
                    color: Color(0xFFFDE68A),
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              controller.errorMessage ??
                  'Please turn on GPS / Location Services on your device settings and try again.',
              style: const TextStyle(color: Color(0xFFE2E8F0), fontSize: 12),
            ),
            const SizedBox(height: 10),
            ElevatedButton(
              onPressed: () => controller.retryPunch(),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF59E0B),
                foregroundColor: Colors.black87,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              ),
              child: const Text('Retry Satellite Fix'),
            ),
          ],
        ),
      );
    }

    if (state == AttendanceUiState.uploadFailed) {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF7F1D1D).withOpacity(0.5),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFDC2626)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.error_outline_rounded, color: Color(0xFFF87171), size: 18),
                SizedBox(width: 8),
                Text(
                  'Upload Failed',
                  style: TextStyle(
                    color: Color(0xFFFCA5A5),
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              controller.errorMessage ??
                  'Network timeout or verification rejection. You can safely retry without creating duplicates.',
              style: const TextStyle(color: Color(0xFFFEE2E2), fontSize: 12),
            ),
            const SizedBox(height: 10),
            ElevatedButton.icon(
              onPressed: () => controller.retryPunch(),
              icon: const Icon(Icons.replay_rounded, size: 16),
              label: const Text('Retry Punch (Duplicate-Safe)'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFDC2626),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              ),
            ),
          ],
        ),
      );
    }

    if (state == AttendanceUiState.success) {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF064E3B).withOpacity(0.5),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF10B981)),
        ),
        child: const Row(
          children: [
            Icon(Icons.check_circle_rounded, color: Color(0xFF34D399), size: 20),
            SizedBox(width: 10),
            Expanded(
              child: Text(
                'Attendance punch verified and recorded by server!',
                style: TextStyle(
                  color: Color(0xFFA7F3D0),
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
            ),
          ],
        ),
      );
    }

    return const SizedBox.shrink();
  }

  Widget _buildActionButtons(TodayAttendance? today, AttendanceUiState state) {
    final canCheckIn = (today?.canCheckIn ?? true) && !controller.isLoading;
    final canCheckOut = (today?.canCheckOut ?? false) && !controller.isLoading;

    return Row(
      children: [
        Expanded(
          child: ElevatedButton.icon(
            onPressed: canCheckIn ? () => controller.initiatePunch(PunchAction.checkIn) : null,
            icon: const Icon(Icons.camera_alt_outlined, size: 18),
            label: const Text('Check In'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              foregroundColor: Colors.white,
              disabledBackgroundColor: const Color(0xFF1E293B),
              disabledForegroundColor: const Color(0xFF64748B),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: ElevatedButton.icon(
            onPressed: canCheckOut ? () => controller.initiatePunch(PunchAction.checkOut) : null,
            icon: const Icon(Icons.exit_to_app_rounded, size: 18),
            label: const Text('Check Out'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF8B5CF6),
              foregroundColor: Colors.white,
              disabledBackgroundColor: const Color(0xFF1E293B),
              disabledForegroundColor: const Color(0xFF64748B),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildHistorySection(List<AttendancePunch> history) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Recent Attendance History',
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 10),
        if (history.isEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withOpacity(0.06)),
            ),
            child: const Center(
              child: Text(
                'No attendance punches recorded yet.',
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
              ),
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: history.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final punch = history[index];
              final isCheckIn = punch.action == PunchAction.checkIn;
              final timeStr =
                  '${punch.serverTimestamp.toLocal().hour.toString().padLeft(2, '0')}:${punch.serverTimestamp.toLocal().minute.toString().padLeft(2, '0')}';

              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withOpacity(0.06)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: (isCheckIn ? const Color(0xFF10B981) : const Color(0xFF8B5CF6))
                            .withOpacity(0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        isCheckIn ? Icons.login_rounded : Icons.logout_rounded,
                        size: 18,
                        color: isCheckIn ? const Color(0xFF10B981) : const Color(0xFF8B5CF6),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                isCheckIn ? 'Check In' : 'Check Out',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF10B981).withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.verified, size: 12, color: Color(0xFF34D399)),
                                    SizedBox(width: 3),
                                    Text(
                                      'Verified',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF34D399),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'GPS Accuracy: ±${punch.accuracyMeters.toStringAsFixed(1)}m • Geofence: ${punch.distanceFromGeofenceMeters.toStringAsFixed(1)}m',
                            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      timeStr,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildPrivacyNotice() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.shield_outlined, size: 16, color: Color(0xFF64748B)),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              'Privacy & Security: Location and camera selfie are captured point-in-time only upon punch submission. WorkforcePro does not implement continuous background location tracking.',
              style: TextStyle(fontSize: 11, color: Color(0xFF64748B), height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}
