import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/config/env_config.dart';

void main() {
  group('EnvConfig', () {
    test('defaults to dev environment when no flags provided', () {
      final config = EnvConfig.fromEnvironment();
      expect(config.environment, AppEnvironment.dev);
      expect(config.isDevelopment, isTrue);
      expect(config.isProduction, isFalse);
      expect(config.apiBaseUrl, 'http://10.0.2.2:5000');
      expect(config.appName, 'WorkforcePro (DEV)');
    });

    test('supports custom constructor configuration', () {
      const config = EnvConfig(
        environment: AppEnvironment.test,
        apiBaseUrl: 'http://test-server:5000',
        appName: 'WorkforcePro Test',
        requestTimeout: Duration(seconds: 10),
      );

      expect(config.isTest, isTrue);
      expect(config.apiBaseUrl, 'http://test-server:5000');
      expect(config.requestTimeout.inSeconds, 10);
    });
  });
}
