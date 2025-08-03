import '@testing-library/jest-dom';
import fetch from 'node-fetch';
import { TextDecoder, TextEncoder } from 'util';

global.fetch = fetch;
global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;

jest.mock('ws', () => ({}));