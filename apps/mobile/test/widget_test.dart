import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('WorkforceProApp renders mobile foundation screen', (WidgetTester tester) async {
    await tester.pumpWidget(const WorkforceProApp());

    expect(find.text('WorkforcePro'), findsOneWidget);
    expect(find.text('Phase 1 Baseline Active'), findsOneWidget);
    expect(find.text('Hardware Device Binding Gateway'), findsOneWidget);
  });
}
