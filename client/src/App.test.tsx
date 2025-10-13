import { render } from '@testing-library/react';
import App from './App';

test('renders without crashing', () => {
  render(<App />);
  // Basic test to ensure the app renders without errors
  expect(document.body).toBeInTheDocument();
});
