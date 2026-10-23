import React, { useState } from 'react';
import { HealthCheckResponse, ErrorCode } from '@workforcepro/api-contracts';

export const App: React.FC = () => {
  // Demonstration of shared API contract usage inside the admin portal
  const [mockHealth] = useState<HealthCheckResponse>({
    status: 'ok',
    version: '0.1.0',
    uptimeSeconds: 3600,
    timestamp: new Date().toISOString(),
    environment: 'development',
    services: {
      database: {
        status: 'connected',
        latencyMs: 14
      },
      memory: {
        heapUsedMb: 62.4,
        heapTotalMb: 110.2,
        rssMb: 145.8
      }
    }
  });

  return (
    <div className="container">
      <header className="header">
        <div className="logo-badge">
          <div className="logo-icon">W</div>
          <span>WorkforcePro Admin</span>
        </div>
        <div>
          <span className="badge badge-success">
            ● Phase 1 Baseline Active
          </span>
        </div>
      </header>

      <main>
        <section className="card">
          <h2 className="card-title">System Status (Contracts Verified)</h2>
          <p className="card-text">
            WorkforcePro monorepo foundation initialized. The web admin application is actively linked to the shared <code>@workforcepro/api-contracts</code> package.
          </p>
        </section>

        <div className="grid">
          <div className="card">
            <h3 className="card-title">Contract Health</h3>
            <p className="card-text">Status: <strong>{mockHealth.status.toUpperCase()}</strong></p>
            <p className="card-text">Database: <strong>{mockHealth.services.database.status}</strong> ({mockHealth.services.database.latencyMs}ms)</p>
            <p className="card-text">Uptime: <strong>{mockHealth.uptimeSeconds}s</strong></p>
          </div>

          <div className="card">
            <h3 className="card-title">Security & Error Model</h3>
            <p className="card-text">Error catalog imported from contracts:</p>
            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
              <li><code>{ErrorCode.GEOFENCE_VIOLATION}</code></li>
              <li><code>{ErrorCode.MOCK_LOCATION_DETECTED}</code></li>
              <li><code>{ErrorCode.DEVICE_MISMATCH}</code></li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
