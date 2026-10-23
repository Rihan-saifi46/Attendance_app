enum AppEnvironment {
  dev,
  test,
  prod,
}

class EnvConfig {
  final AppEnvironment environment;
  final String apiBaseUrl;
  final String appName;
  final Duration requestTimeout;

  const EnvConfig({
    required this.environment,
    required this.apiBaseUrl,
    required this.appName,
    required this.requestTimeout,
  });

  bool get isProduction => environment == AppEnvironment.prod;
  bool get isDevelopment => environment == AppEnvironment.dev;
  bool get isTest => environment == AppEnvironment.test;

  static EnvConfig fromEnvironment() {
    const envString = String.fromEnvironment('APP_ENV', defaultValue: 'dev');
    const customBaseUrl = String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: '',
    );

    final environment = switch (envString.toLowerCase()) {
      'prod' || 'production' => AppEnvironment.prod,
      'test' => AppEnvironment.test,
      _ => AppEnvironment.dev,
    };

    final defaultBaseUrl = switch (environment) {
      AppEnvironment.prod => 'https://api.workforcepro.example.com',
      AppEnvironment.test => 'http://127.0.0.1:5000',
      AppEnvironment.dev => 'http://10.0.2.2:5000', // Standard Android emulator loopback
    };

    return EnvConfig(
      environment: environment,
      apiBaseUrl: customBaseUrl.isNotEmpty ? customBaseUrl : defaultBaseUrl,
      appName: environment == AppEnvironment.prod
          ? 'WorkforcePro'
          : 'WorkforcePro (${environment.name.toUpperCase()})',
      requestTimeout: const Duration(seconds: 15),
    );
  }
}
