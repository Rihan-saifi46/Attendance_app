import { describe, it, expect } from 'vitest';
import React from 'react';
import App from '../App.js';

describe('AdminApp', () => {
  it('should be a valid React functional component', () => {
    expect(typeof App).toBe('function');
    const element = React.createElement(App);
    expect(React.isValidElement(element)).toBe(true);
  });
});
