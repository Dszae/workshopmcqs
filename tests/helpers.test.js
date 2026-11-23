import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTime, shuffle } from '../src/utils/helpers.js';

test('formatTime formats seconds into mm:ss', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(59), '00:59');
  assert.equal(formatTime(60), '01:00');
  assert.equal(formatTime(125), '02:05');
  assert.equal(formatTime(3600), '60:00');
});

test('formatTime handles invalid inputs gracefully', () => {
  assert.equal(formatTime(-10), '00:00');
  assert.equal(formatTime(NaN), '00:00');
  assert.equal(formatTime(null), '00:00');
});

test('shuffle preserves elements and length', () => {
  const input = [1, 2, 3, 4, 5];
  const result = shuffle(input);

  assert.equal(result.length, input.length);
  assert.deepEqual([...result].sort((a, b) => a - b), input);
  assert.notEqual(result, input);
});

test('shuffle handles empty and single-element arrays', () => {
  assert.deepEqual(shuffle([]), []);
  assert.deepEqual(shuffle([42]), [42]);
});
