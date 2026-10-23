// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App.js';

describe('Admin Web Portal — Employee & Organization Management', () => {
  it('should render the brand header, tenant indicator, and employee directory metrics', () => {
    render(<App />);

    expect(screen.getByText('WorkforcePro')).toBeDefined();
    expect(screen.getByText('Acme Technologies')).toBeDefined();
    expect(screen.getByText('Total Headcount')).toBeDefined();
    expect(screen.getByText('Active Employees')).toBeDefined();
    expect(screen.getByText('Monthly Payroll Base')).toBeDefined();
  });

  it('should filter employees when searching by name or designation', () => {
    render(<App />);

    const searchInput = screen.getByPlaceholderText(
      'Search by name, code, designation, or email...'
    );
    expect(searchInput).toBeDefined();

    // Search for Samantha
    fireEvent.change(searchInput, { target: { value: 'Samantha' } });
    expect(screen.getByText('Samantha Chen')).toBeDefined();
    expect(screen.queryByText('Lucas Scott')).toBeNull();

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('Samantha Chen')).toBeDefined();
    expect(screen.getByText('David Miller')).toBeDefined();
  });

  it('should switch between tabs: Employees, Departments & Shifts, and Bulk Import', () => {
    render(<App />);

    // Switch to Departments & Shifts tab
    const orgTabBtn = screen.getByRole('button', { name: /Departments & Shifts/i });
    fireEvent.click(orgTabBtn);
    expect(screen.getByText('Departments & Shifts Management')).toBeDefined();
    expect(screen.getByText('Add Department')).toBeDefined();
    expect(screen.getByText('Add Shift & Schedule')).toBeDefined();

    // Switch to Bulk Import tab
    const importTabBtn = screen.getByRole('button', { name: /Bulk Import/i });
    fireEvent.click(importTabBtn);
    expect(screen.getByText('Bulk Employee Import Engine')).toBeDefined();
    expect(screen.getByText('Analyze & Preview Batch')).toBeDefined();

    // Switch back to Employees tab
    const empTabBtn = screen.getByRole('button', { name: /Employees/i });
    fireEvent.click(empTabBtn);
    expect(screen.getByText('Employee Directory')).toBeDefined();
  });

  it('should open and close the Add Employee modal', () => {
    render(<App />);

    const addBtn = screen.getByRole('button', { name: /\+ Add Employee/i });
    fireEvent.click(addBtn);

    expect(screen.getByText('Add New Employee')).toBeDefined();
    expect(screen.getByText(/Compensation & Salary Type Selection/i)).toBeDefined();

    // Close modal
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);
    expect(screen.queryByText('Add New Employee')).toBeNull();
  });

  it('should open Employee Detail drawer and show compensation and history tabs', () => {
    render(<App />);

    // Click "View" button for first employee
    const viewButtons = screen.getAllByRole('button', { name: 'View' });
    expect(viewButtons.length).toBeGreaterThan(0);
    fireEvent.click(viewButtons[0]!);

    // Drawer should show employee details
    expect(screen.getByRole('button', { name: /Compensation 🔒/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Change History/i })).toBeDefined();

    // Switch to Compensation tab
    const compTab = screen.getByRole('button', { name: /Compensation 🔒/i });
    fireEvent.click(compTab);
    expect(screen.getByText(/Field-Level Security Active/i)).toBeDefined();
    expect(screen.getByText(/Salary Type Selection/i)).toBeDefined();

    // Switch to History tab
    const historyTab = screen.getByRole('button', { name: /Change History/i });
    fireEvent.click(historyTab);
    expect(screen.getByText(/Leadership compensation review/i)).toBeDefined();
  });
});
