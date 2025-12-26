import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage.jsx';

describe('HomePage', () => {
  it('renders CTA links', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByText(/CVUR Portal/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Create Account/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Login/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Browse Ratings/i })).toBeInTheDocument();
  });
});
