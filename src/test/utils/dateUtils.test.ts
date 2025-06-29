import * as assert from 'assert';
import { getYear, getMonth, getDay, formatDate } from '../../utils/dateUtils';

suite('dateUtils', () => {
  const testDate = new Date('2025-06-27T10:30:00');

  test('getYear should return year as string', () => {
    assert.strictEqual(getYear(testDate), '2025');
  });

  test('getMonth should return month with zero padding', () => {
    assert.strictEqual(getMonth(testDate), '06');
  });

  test('getDay should return day with zero padding', () => {
    assert.strictEqual(getDay(testDate), '27');
  });

  test('formatDate should return formatted date string', () => {
    assert.strictEqual(formatDate(testDate), '2025-06-27');
  });

  test('getMonth should pad single digit months', () => {
    const janDate = new Date('2025-01-05T10:30:00');
    assert.strictEqual(getMonth(janDate), '01');
  });

  test('getDay should pad single digit days', () => {
    const singleDigitDay = new Date('2025-06-05T10:30:00');
    assert.strictEqual(getDay(singleDigitDay), '05');
  });
});