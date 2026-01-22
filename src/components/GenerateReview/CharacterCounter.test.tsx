import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CharacterCounter } from './CharacterCounter';

describe('CharacterCounter Component', () => {
  // UT-003: CharacterCounter Component Tests
  describe('display and counting', () => {
    it('should display correct character count', () => {
      render(<CharacterCounter current={50} max={200} />);
      
      expect(screen.getByText(/50 \/ 200/)).toBeInTheDocument();
    });

    it('should display zero count', () => {
      render(<CharacterCounter current={0} max={200} />);
      
      expect(screen.getByText(/0 \/ 200/)).toBeInTheDocument();
    });

    it('should display at maximum count', () => {
      render(<CharacterCounter current={200} max={200} />);
      
      expect(screen.getByText(/200 \/ 200/)).toBeInTheDocument();
    });
  });

  describe('color states based on percentage', () => {
    it('should show muted color when below 80% (safe zone)', () => {
      const { container } = render(<CharacterCounter current={79} max={100} />);
      
      const counter = container.querySelector('span');
      expect(counter).toHaveClass('text-muted-foreground');
    });

    it('should show yellow/warning color when at 80% threshold', () => {
      const { container } = render(<CharacterCounter current={80} max={100} />);
      
      const counter = container.querySelector('span');
      expect(counter).toHaveClass('text-yellow-600');
    });

    it('should show yellow/warning color when between 80-94% (warning zone)', () => {
      const { container } = render(<CharacterCounter current={85} max={100} />);
      
      const counter = container.querySelector('span');
      expect(counter).toHaveClass('text-yellow-600');
    });

    it('should show destructive/red color when at 95% threshold', () => {
      const { container } = render(<CharacterCounter current={95} max={100} />);
      
      const counter = container.querySelector('span');
      expect(counter).toHaveClass('text-destructive');
    });

    it('should show destructive/red color when at 100% (danger zone)', () => {
      const { container } = render(<CharacterCounter current={100} max={100} />);
      
      const counter = container.querySelector('span');
      expect(counter).toHaveClass('text-destructive');
    });
  });

  describe('exceeding limit', () => {
    it('should show destructive color when exceeding limit', () => {
      const { container } = render(<CharacterCounter current={101} max={100} />);
      
      const counter = container.querySelector('span');
      expect(counter).toHaveClass('text-destructive');
    });

    it('should show font-medium when exceeding limit', () => {
      const { container } = render(<CharacterCounter current={101} max={100} />);
      
      const counter = container.querySelector('span');
      expect(counter).toHaveClass('font-medium');
    });

    it('should display correct count when exceeding limit', () => {
      render(<CharacterCounter current={250} max={200} />);
      
      expect(screen.getByText(/250 \/ 200/)).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show destructive color when showError is true', () => {
      const { container } = render(
        <CharacterCounter current={50} max={200} showError={true} />
      );
      
      const counter = container.querySelector('span');
      expect(counter).toHaveClass('text-destructive');
    });

    it('should show destructive color even below threshold when showError is true', () => {
      const { container } = render(
        <CharacterCounter current={10} max={200} showError={true} />
      );
      
      const counter = container.querySelector('span');
      expect(counter).toHaveClass('text-destructive');
    });
  });

  describe('accessibility', () => {
    it('should have aria-live="polite" for dynamic updates', () => {
      const { container } = render(<CharacterCounter current={50} max={200} />);
      
      const counter = container.querySelector('[aria-live="polite"]');
      expect(counter).toBeInTheDocument();
    });

    it('should have aria-atomic="true"', () => {
      const { container } = render(<CharacterCounter current={50} max={200} />);
      
      const counter = container.querySelector('[aria-atomic="true"]');
      expect(counter).toBeInTheDocument();
    });

    it('should include screen reader label when provided', () => {
      render(
        <CharacterCounter 
          current={50} 
          max={200} 
          label="Front text character count" 
        />
      );
      
      expect(screen.getByLabelText(/Front text character count/)).toBeInTheDocument();
      expect(screen.getByText(/50 of 200 characters/)).toBeInTheDocument();
    });
  });

  describe('real-world scenarios', () => {
    it('should handle front text limit (200 characters)', () => {
      render(<CharacterCounter current={150} max={200} />);
      
      expect(screen.getByText(/150 \/ 200/)).toBeInTheDocument();
    });

    it('should handle back text limit (500 characters)', () => {
      render(<CharacterCounter current={450} max={500} />);
      
      expect(screen.getByText(/450 \/ 500/)).toBeInTheDocument();
    });

    it('should handle generation text limit (10,000 characters)', () => {
      render(<CharacterCounter current={9500} max={10000} />);
      
      expect(screen.getByText(/9500 \/ 10000/)).toBeInTheDocument();
    });

    it('should show warning when approaching front limit (>160 chars)', () => {
      const { container } = render(<CharacterCounter current={161} max={200} />);
      
      const counter = container.querySelector('span');
      expect(counter).toHaveClass('text-yellow-600');
    });

    it('should show danger when approaching back limit (>475 chars)', () => {
      const { container } = render(<CharacterCounter current={476} max={500} />);
      
      const counter = container.querySelector('span');
      expect(counter).toHaveClass('text-destructive');
    });
  });
});
