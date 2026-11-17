import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { sampleCatalog } from '@/test/catalog';
import { renderApp } from '@/test/render';

const warningsNote = () => screen.getByRole('complementary', { name: 'Content warnings' });

describe('content warnings at two levels', () => {
  it('story page lists detailed warnings and brief mentions apart', async () => {
    renderApp('/stories/sample-l-ron-hubbard', sampleCatalog);
    await screen.findByRole('heading', { level: 1 });
    expect(warningsNote()).toHaveTextContent('Mentions briefly: suicide & self-harm.');
    expect(within(warningsNote()).queryByText(/Spends real time on/)).toBeNull();
    expect(within(warningsNote()).queryByText(/Not yet checked/)).toBeNull();
  });

  it('says when a story was never checked for brief mentions', async () => {
    renderApp('/stories/sample-percy-fawcett', sampleCatalog);
    await screen.findByRole('heading', { level: 1 });
    expect(warningsNote()).toHaveTextContent(
      'Not yet checked for brief mentions of sensitive topics.',
    );
  });

  it('the rail hides brief mentions too, unless only detail is asked for', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/?cw-hide=suicide-self-harm', sampleCatalog);
    await screen.findByRole('heading', { name: 'The catalogue' });
    expect(document.querySelector('[data-story="sample-l-ron-hubbard"]')).toBeNull();
    expect(
      screen.getByText(
        /For sexual violence, child sexual abuse, child abuse, suicide & self-harm and animal cruelty, a brief mention/,
      ),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('checkbox', { name: 'Only hide stories that discuss them in detail' }),
    );
    expect(router.state.location.search).toContain('cw-detail=1');
    expect(document.querySelector('[data-story="sample-l-ron-hubbard"]')).not.toBeNull();
    expect(
      screen.getByRole('button', { name: /Hiding: Suicide & self-harm \(in detail\)/ }),
    ).toBeInTheDocument();
  });
});
