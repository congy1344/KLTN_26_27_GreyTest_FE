// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../api/api-client';
import { LanguageToggle } from '../components/LanguageToggle';
import { LanguageProvider, useLanguage } from './language';

function TranslatedLabel() {
  const { t } = useLanguage();
  return <span>{t('Phân tích', 'Analyze')}</span>;
}

describe('system language', () => {
  beforeEach(() => localStorage.clear());

  it('persists the selected language for UI and API requests', async () => {
    render(
      <LanguageProvider>
        <LanguageToggle />
        <TranslatedLabel />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'EN' }));

    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Analyze')).toBeVisible();
    await waitFor(() => expect(localStorage.getItem('greytest.language')).toBe('en'));
    expect(document.documentElement.lang).toBe('en');

    const adapter = vi.fn(async (config) => ({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    await apiClient.get('/language-check', { adapter });
    expect(adapter.mock.calls[0][0].headers['Accept-Language']).toBe('en');
  });
});
