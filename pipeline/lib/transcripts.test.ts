// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { srtToText } from './transcripts.ts';

const SRT = `1
00:00:02,120 --> 00:00:08,080
Speaker 1: What's five in my part,

2
00:00:08,119 --> 00:00:12,440
Speaker 1: it's part five.

3
00:00:12,520 --> 00:00:15,480
Speaker 2: Sure.

4
00:00:50,000 --> 00:00:54,000
Speaker 2: Still me, much later.
`;

describe('srtToText', () => {
  it('groups cues by speaker and every 30 seconds, keeping the start time', () => {
    expect(srtToText(SRT)).toBe(
      "00:00:02\nSpeaker 1: What's five in my part, it's part five.\n\n" +
        '00:00:12\nSpeaker 2: Sure.\n\n' +
        '00:00:50\nSpeaker 2: Still me, much later.\n',
    );
  });
  it('handles CRLF and cues without a speaker label', () => {
    const out = srtToText(
      '1\r\n00:01:00,000 --> 00:01:02,000\r\nSpeaker 3: Hi\r\n\r\n2\r\n00:01:03,000 --> 00:01:04,000\r\nthere\r\n',
    );
    expect(out).toBe('00:01:00\nSpeaker 3: Hi there\n');
  });
});
