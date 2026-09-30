/* Bit Flipper — GATE CS Prep Desk concept game (Digital Logic).
   Base conversion, 2's / 1's complement, sign-magnitude, overflow, fixed point and IEEE-754.
   Plain JS, no libraries, no network. See games/GAMES.md for the contract. */
(function () {
  'use strict';
  var ID = 'number-systems';

  /* ---------------- pure helpers ---------------- */
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function pow2(k) { return Math.pow(2, k); }
  function toBits(u, n) { var a = []; for (var i = n - 1; i >= 0; i--) a.push(Math.floor(u / pow2(i)) % 2); return a; }
  function fromBits(b) { var v = 0; for (var i = 0; i < b.length; i++) v = v * 2 + b[i]; return v; }
  function bstr(b) { return b.join(''); }
  function nib(b, k) { // group a bit array from the right in chunks of k, joined by spaces
    var s = bstr(b), out = [];
    while (s.length > k) { out.unshift(s.slice(-k)); s = s.slice(0, -k); }
    out.unshift(s); return out.join(' ');
  }
  function inv(b) { return b.map(function (x) { return 1 - x; }); }
  function plus1(b) { var r = b.slice(), i = r.length - 1; while (i >= 0 && r[i] === 1) { r[i] = 0; i--; } if (i >= 0) r[i] = 1; return r; }
  var DIG = '0123456789ABCDEF';
  function toBase(v, b) { // repeated division, returns {s, steps}
    if (v === 0) return { s: '0', steps: [] };
    var s = '', steps = [], x = v;
    while (x > 0) { var q = Math.floor(x / b), r = x % b; steps.push([x, q, r]); s = DIG[r] + s; x = q; }
    return { s: s, steps: steps };
  }
  function parseBase(str, b) {
    var t = String(str).trim().toUpperCase().replace(/[\s_]/g, '').replace(/^0X|^0B|^0O/, '');
    if (!t) return null;
    var v = 0;
    for (var i = 0; i < t.length; i++) { var d = DIG.indexOf(t[i]); if (d < 0 || d >= b) return null; v = v * b + d; }
    return v;
  }
  function parseNum(s) {
    var t = String(s).replace(/[,\s]/g, '').replace(/−/g, '-');
    if (/^[-+]?\d+\/\d+$/.test(t)) { var p = t.split('/'); return Number(p[1]) === 0 ? null : Number(p[0]) / Number(p[1]); }
    if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
    return Number(t);
  }
  var SUB = { 2: '₂', 8: '₈', 10: '₁₀', 16: '₁₆' };
  function fmtIn(v, b, width) {
    var s = toBase(v, b).s;
    if (b === 2) { if (width) s = s.padStart(width, '0'); return nib(s.split('').map(Number), 4) + SUB[2]; }
    return s + SUB[b];
  }
  function signed(v) { return v > 0 ? '+' + v : String(v); }

  /* representations: '2c' two's complement, '1c' one's complement, 'sm' sign-magnitude */
  var REPN = { '2c': "2's complement", '1c': "1's complement", 'sm': 'sign-magnitude' };
  function range(rep, n) { return rep === '2c' ? [-pow2(n - 1), pow2(n - 1) - 1] : [-(pow2(n - 1) - 1), pow2(n - 1) - 1]; }
  function encode(v, n, rep) {
    if (v >= 0) return toBits(v, n);
    if (rep === '2c') return toBits(pow2(n) + v, n);
    if (rep === '1c') return toBits(pow2(n) - 1 + v, n);
    return toBits(pow2(n - 1) - v, n);
  }
  function decode(b, rep) {
    var n = b.length, u = fromBits(b);
    if (b[0] === 0) return u;
    if (rep === '2c') return u - pow2(n);
    if (rep === '1c') return -(pow2(n) - 1 - u);
    return -(u - pow2(n - 1));
  }

  /* IEEE-754 single precision (exact for the values generated here) */
  function ieeeBits(s, e, frac) { return [s].concat(toBits(e, 8), frac); }
  function ieeeValue(b) {
    var s = b[0], e = fromBits(b.slice(1, 9)), f = b.slice(9), fi = fromBits(f), sg = s ? -1 : 1;
    if (e === 255) return fi ? NaN : sg * Infinity;
    if (e === 0) return sg * fi * pow2(-149);
    return sg * (1 + fi / pow2(23)) * pow2(e - 127);
  }
  function hexOf(b) { var s = ''; for (var i = 0; i < b.length; i += 4) s += DIG[fromBits(b.slice(i, i + 4))]; return s; }
  function bitsOfHex(h, n) { var v = parseBase(h, 16); return v === null ? null : toBits(v, n); }
  function genIEEE() { // normal number with a short exact decimal expansion
    var E = rnd(-4, 10), k = rnd(0, Math.min(4, E + 6)), top = 0;
    if (k > 0) top = rnd(0, pow2(k - 1) - 1) * 2 + 1;
    var frac = toBits(top * pow2(23 - k), 23), s = rnd(0, 1);
    var b = ieeeBits(s, E + 127, frac);
    return { s: s, E: E, k: k, top: top, bits: b, value: (s ? -1 : 1) * (1 + top / pow2(k)) * pow2(E) };
  }
  function binPoint(intStr, fracStr) { return intStr + (fracStr ? '.' + fracStr : ''); }
  function shifted(k, top, E) { // 1.f x 2^E written as a plain binary number
    var digits = '1' + (k ? top.toString(2).padStart(k, '0') : ''), pt = 1 + E; // point after `pt` digits
    if (pt <= 0) return '0.' + '0'.repeat(-pt) + digits.replace(/0+$/, '');
    if (pt >= digits.length) return digits + '0'.repeat(pt - digits.length);
    return binPoint(digits.slice(0, pt), digits.slice(pt).replace(/0+$/, ''));
  }

  /* ---------------- question kinds ---------------- */
  function Lf(lang) { return function (en, hi) { return lang === 'hi' ? hi : en; }; }
  function groupsOf(n, k, label) {
    var g = [], first = n % k || k;
    g.push({ size: first, label: '' });
    for (var left = n - first; left > 0; left -= k) g.push({ size: k, label: '' });
    if (label) g[0].label = label;
    return g;
  }
  function ieeeGroups(L) {
    return [{ size: 1, label: L('S', 'S') }, { size: 8, label: L('exponent (8)', 'exponent (8)') }, { size: 8, label: L('fraction 1-8', 'fraction 1-8') }, { size: 8, label: L('fraction 9-16', 'fraction 9-16') }, { size: 7, label: L('fraction 17-23', 'fraction 17-23') }];
  }
  function numQ(q) {
    q.type = 'num';
    q.check = function (v) { var x = parseNum(v); return x !== null && Math.abs(x - q.ans) <= 1e-9 * Math.max(1, Math.abs(q.ans)); };
    if (q.answerText === undefined) q.answerText = String(q.ans);
    return q;
  }
  function bitsQ(q, hexOk) {
    q.type = 'bits'; q.hexOk = !!hexOk;
    q.parse = function (v) {
      var t = String(v).trim().replace(/[\s_.]/g, '');
      var n = q.ans.length;
      if (/^0x/i.test(t) || (hexOk && t.length === n / 4 && /^[0-9a-f]+$/i.test(t))) { var h = t.replace(/^0x/i, ''); if (h.length > n / 4 || !/^[0-9a-f]+$/i.test(h)) return null; return bitsOfHex(h, n); }
      if (/^[01]+$/.test(t) && t.length <= n) return t.padStart(n, '0').split('').map(Number);
      return null;
    };
    q.check = function (v) { var b = q.parse(v); return !!b && bstr(b) === bstr(q.ans); };
    q.answerText = hexOk ? nib(q.ans, 4) + '  (0x' + hexOf(q.ans) + ')' : nib(q.ans, 4);
    return q;
  }
  function choiceQ(q, choices) { q.type = 'choice'; q.choices = choices; q.check = function (i) { return i === q.ans; }; q.answerText = choices[q.ans]; return q; }
  function weightsLine(n, rep) {
    var w = []; for (var i = n - 1; i >= 0; i--) w.push(i === n - 1 && rep === '2c' ? '-' + pow2(i) : String(pow2(i)));
    return w.join(' ');
  }

  var K = {};

  K.conv = function (level, L) {
    var pairs = level === 1 ? [[10, 2], [2, 10], [10, 16], [16, 10], [2, 16], [16, 2], [10, 8], [2, 8]]
      : [[10, 2], [2, 16], [16, 2], [8, 16], [16, 8], [8, 2], [2, 8], [10, 16], [16, 10], [8, 10], [10, 8]];
    var pr = pick(pairs), a = pr[0], b = pr[1], v = level === 1 ? rnd(10, 255) : rnd(100, 4095);
    var width = level === 1 ? (b === 8 || a === 8 ? 9 : 8) : 12;
    var q = { kind: 'conv', data: { v: v, a: a, b: b }, ansStr: toBase(v, b).s, base: b };
    var src = fmtIn(v, a, a === 2 ? width : 0);
    q.text = L('Convert ' + src + ' to base ' + b + '.', src + ' ko base ' + b + ' me convert karo.');
    q.hint = b === 10 ? L('Multiply each digit by its place value (' + a + '^position) and add.', 'Har digit ko uski place value (' + a + '^position) se multiply karke jodo.')
      : a === 10 ? L('Divide by ' + b + ' repeatedly; the remainders read bottom-up are the digits.' + (b !== 2 ? ' Or build the binary in the cells first.' : ''), 'Baar baar ' + b + ' se divide karo; remainders neeche se upar padho.' + (b !== 2 ? ' Ya pehle cells me binary banao.' : ''))
        : L('Go through binary: each hex digit = 4 bits, each octal digit = 3 bits.', 'Binary ke through jao: har hex digit = 4 bits, har octal digit = 3 bits.');
    var k = b === 8 ? 3 : 4;
    if (b !== 10) q.grid = { n: width, groups: groupsOf(width, k), rows: [{ id: 'ans', label: L('Ans', 'Ans'), bits: toBits(0, width), edit: 'toggle' }], ans: 'ans', dec: b === 2 ? null : b, sumAt1: true };
    else q.grid = { n: width, groups: groupsOf(width, a === 8 ? 3 : 4), rows: [{ id: 'src', label: L('Src', 'Src'), bits: toBits(v, width), edit: 'toggle' }], dec: a === 2 ? null : a, scratch: true, weights: level === 1 ? weightsLine(width, 'u') : null };
    q.type = 'base';
    q.check = function (s) { var x = parseBase(s, b); return x !== null && x === v; };
    q.answerText = q.ansStr + SUB[b];
    q.explain = function () {
      var out = [];
      if (a === 10) {
        var st = toBase(v, b).steps;
        out.push(L('Repeated division by ' + b + ':', b + ' se baar baar divide karo:'));
        out.push({ c: st.map(function (r) { return String(r[0]).padStart(5) + ' / ' + b + ' = ' + String(r[1]).padEnd(5) + ' remainder ' + r[2] + (b === 16 && r[2] > 9 ? ' (' + DIG[r[2]] + ')' : ''); }).join('\n') });
        out.push(L('Read the remainders from bottom to top: ' + q.ansStr + SUB[b] + '.', 'Remainders neeche se upar padho: ' + q.ansStr + SUB[b] + '.'));
      } else if (b === 10) {
        var ds = toBase(v, a).s, terms = [], sum = [];
        for (var i = 0; i < ds.length; i++) { var d = DIG.indexOf(ds[i]), p = ds.length - 1 - i; if (d) { terms.push(d + 'x' + a + '^' + p); sum.push(d * pow2(0) * Math.pow(a, p)); } }
        out.push(L('Place values: digit x ' + a + '^position (position 0 on the right):', 'Place values: digit x ' + a + '^position (right se position 0):'));
        out.push({ c: terms.join(' + ') + '\n= ' + sum.join(' + ') + '\n= ' + v });
      } else {
        var bin = toBase(v, 2).s, ka = a === 8 ? 3 : 4, kb = b === 8 ? 3 : 4;
        if (a !== 2) {
          out.push(L('Expand each base-' + a + ' digit into exactly ' + ka + ' bits:', 'Har base-' + a + ' digit ko exactly ' + ka + ' bits me likho:'), { c: toBase(v, a).s.split('').map(function (d) { return d + ' -> ' + bstr(toBits(DIG.indexOf(d), ka)); }).join('\n') });
          out.push(L('Joined (leading zeros dropped): ' + bin + '₂', 'Jod kar (leading zeros hata kar): ' + bin + '₂'));
        }
        if (b !== 2) {
          var bb = bin.padStart(Math.ceil(bin.length / kb) * kb, '0').split('').map(Number), groups = nib(bb, kb).split(' ');
          out.push(L('Regroup the binary from the RIGHT in ' + kb + 's (pad zeros on the left) and read each group as a base-' + b + ' digit:', 'Binary ko RIGHT se ' + kb + '-' + kb + ' ke groups me baanto (left me zeros pad) aur har group ko base-' + b + ' digit padho:'));
          out.push({ c: groups.join(' ') + '\n' + groups.map(function (g) { return DIG[parseInt(g, 2)].padStart(g.length); }).join(' ') });
        }
        out.push(L('Answer: ' + q.ansStr + SUB[b] + ' (leading zeros do not matter).', 'Answer: ' + q.ansStr + SUB[b] + ' (leading zeros matter nahi karte).'));
      }
      return out;
    };
    q.revise = L('Base conversion: division-remainder, place values, 3/4-bit grouping', 'Base conversion: division-remainder, place values, 3/4-bit grouping');
    return q;
  };

  function repFor(level) { return level === 1 ? '2c' : pick(['2c', '2c', '1c', 'sm']); }
  function nFor(level) { return level === 1 ? pick([4, 5, 6, 8]) : level === 2 ? pick([6, 8, 8, 10, 12]) : pick([8, 12, 16]); }

  function encSteps(v, n, rep, L) {
    var m = Math.abs(v), mb = toBits(m, n), out = [];
    if (v >= 0) return [L(v + ' is non-negative: every representation writes it as plain binary with MSB 0.', v + ' non-negative hai: har representation me seedha binary, MSB 0.'), { c: signed(v) + ' = ' + nib(mb, 4) }];
    if (rep === 'sm') {
      out.push(L('Sign-magnitude: MSB = 1 for negative, remaining ' + (n - 1) + ' bits = |' + v + '| = ' + m + '.', 'Sign-magnitude: negative ke liye MSB = 1, baaki ' + (n - 1) + ' bits = |' + v + '| = ' + m + '.'));
      out.push({ c: 'sign 1 | ' + bstr(toBits(m, n - 1)) + '\n= ' + nib(encode(v, n, rep), 4) });
      return out;
    }
    out.push(L('Step 1: write |' + v + '| = ' + m + ' in ' + n + ' bits.', 'Step 1: |' + v + '| = ' + m + ' ko ' + n + ' bits me likho.'));
    var ib = inv(mb);
    if (rep === '1c') {
      out.push({ c: '|x|    ' + nib(mb, 4) + '\ninvert ' + nib(ib, 4) });
      out.push(L("1's complement of a negative number = invert every bit. Done.", "Negative ka 1's complement = har bit invert. Bas."));
      return out;
    }
    var r = plus1(ib);
    out.push({ c: '|x|    ' + nib(mb, 4) + '\ninvert ' + nib(ib, 4) + '\n+1     ' + nib(toBits(1, n), 4) + '\n' + '-'.repeat(7 + nib(mb, 4).length) + '\nresult ' + nib(r, 4) });
    out.push(L('Step 2: invert all bits (1\'s complement). Step 3: add 1 - the carry ripples through the trailing 1s. Shortcut: copy bits from the right up to and including the first 1, then invert the rest.',
      'Step 2: saare bits invert (1\'s complement). Step 3: 1 add karo - carry trailing 1s se aage badhta hai. Shortcut: right se pehle 1 tak bits copy karo (us 1 samet), baaki invert.'));
    if (v === -pow2(n - 1)) out.push(L('Edge case: -' + pow2(n - 1) + ' is the most negative ' + n + '-bit value; its pattern 1000...0 has no positive partner.', 'Edge case: -' + pow2(n - 1) + ' sabse negative ' + n + '-bit value hai; 1000...0 ka koi positive partner nahi.'));
    return out;
  }

  K.enc = function (level, L) {
    var rep = repFor(level), n = nFor(level), rg = range(rep, n), v;
    if (level >= 2 && rep === '2c' && Math.random() < 0.15) v = rg[0];
    else if (Math.random() < 0.8) v = -rnd(1, -rg[0] === pow2(n - 1) ? pow2(n - 1) - 1 : -rg[0]);
    else v = rnd(1, rg[1]);
    var q = { kind: 'enc', data: { v: v, n: n, rep: rep }, ans: encode(v, n, rep) };
    q.text = L('Write ' + signed(v) + ' in ' + n + '-bit ' + REPN[rep] + '. Flip the cells (or type the bits).', signed(v) + ' ko ' + n + '-bit ' + REPN[rep] + ' me likho. Cells flip karo (ya bits type karo).');
    q.hint = rep === '2c' ? L('Write |x| in binary, invert every bit, add 1 (use the Invert and +1 buttons).', '|x| binary me likho, saare bits invert, phir +1 (Invert aur +1 buttons use karo).') : rep === '1c' ? L('Write |x| in binary, then invert every bit.', '|x| binary me likho, phir saare bits invert.') : L('MSB is the sign (1 = negative), the rest is |x|.', 'MSB sign hai (1 = negative), baaki |x|.');
    q.grid = { n: n, groups: groupsOf(n, 4), rows: [{ id: 'ans', label: L('Ans', 'Ans'), bits: toBits(0, n), edit: 'toggle' }], ans: 'ans', tools: true, sumAt1: true, weights: level === 1 ? weightsLine(n, rep) : null };
    q.explain = function () { return encSteps(v, n, rep, L).concat([L('Answer: ' + nib(q.ans, 4), 'Answer: ' + nib(q.ans, 4))]); };
    q.revise = L('Encoding negatives: 2\'s = invert + 1, 1\'s = invert, SM = sign bit + magnitude', 'Negative encode: 2\'s = invert + 1, 1\'s = invert, SM = sign bit + magnitude');
    return bitsQ(q, false);
  };

  K.dec = function (level, L) {
    var rep = level === 3 ? '2c' : repFor(level), n = level === 3 ? 16 : nFor(level), b;
    b = toBits(rnd(0, pow2(n) - 1), n);
    if (Math.random() < 0.8) b[0] = 1;
    if (level === 3 && Math.random() < 0.6) { var run = rnd(4, 10); for (var i = 1; i < run; i++) b[i] = 1; } // typical 0xFFxx pattern
    if (level === 2 && rep !== '2c' && Math.random() < 0.15) b = b.map(function (x, i) { return i === 0 ? 1 : (rep === '1c' ? 1 : 0); }); // negative zero
    var val = decode(b, rep), useHex = level === 3;
    var q = { kind: 'dec', data: { b: b, rep: rep }, ans: val };
    var shown = useHex ? '0x' + hexOf(b) : nib(b, 4);
    q.text = L('The ' + n + '-bit pattern ' + shown + ' is a ' + REPN[rep] + ' number. What is its decimal value?', n + '-bit pattern ' + shown + ' ' + REPN[rep] + ' me hai. Iski decimal value kya hai?');
    q.hint = L('MSB 0 -> positive, read as binary. MSB 1 -> negative: undo the encoding to get the magnitude.', 'MSB 0 -> positive, seedha binary. MSB 1 -> negative: encoding ulta karke magnitude nikalo.');
    q.grid = { n: n, groups: groupsOf(n, 4), rows: [{ id: 'reg', label: L('Reg', 'Reg'), bits: b.slice(), edit: 'toggle' }], tools: true, scratch: true, sumAt1: true, dec: useHex ? 16 : null, weights: level === 1 ? weightsLine(n, rep) : null };
    q.explain = function () {
      var out = [];
      if (useHex) out.push(L('Hex to binary, 4 bits per digit: 0x' + hexOf(b) + ' = ' + nib(b, 4) + '.', 'Hex se binary, har digit 4 bits: 0x' + hexOf(b) + ' = ' + nib(b, 4) + '.'));
      if (b[0] === 0) { out.push(L('MSB = 0, so it is positive: ' + nib(b, 4) + ' = ' + val + '.', 'MSB = 0, toh positive: ' + nib(b, 4) + ' = ' + val + '.')); return out; }
      if (rep === '2c') {
        var ib = inv(b), m = plus1(ib);
        out.push(L('MSB = 1 -> negative. Invert and add 1 to get the magnitude:', 'MSB = 1 -> negative. Magnitude ke liye invert karke 1 add karo:'));
        out.push({ c: 'pattern ' + nib(b, 4) + '\ninvert  ' + nib(ib, 4) + '\n+1      ' + nib(m, 4) + ' = ' + fromBits(m) });
        out.push(L('So the value is -' + fromBits(m) + '. Check with weights: -2^' + (n - 1) + ' + (rest) = -' + pow2(n - 1) + ' + ' + fromBits(b.slice(1)) + ' = ' + val + '.', 'Toh value -' + fromBits(m) + '. Weights se check: -2^' + (n - 1) + ' + (baaki) = -' + pow2(n - 1) + ' + ' + fromBits(b.slice(1)) + ' = ' + val + '.'));
      } else if (rep === '1c') {
        out.push(L('MSB = 1 -> negative. Invert every bit to get the magnitude:', 'MSB = 1 -> negative. Magnitude ke liye har bit invert karo:'));
        out.push({ c: 'pattern ' + nib(b, 4) + '\ninvert  ' + nib(inv(b), 4) + ' = ' + fromBits(inv(b)) });
        out.push(val === 0 ? L("All ones is 1's-complement NEGATIVE ZERO: value 0.", "Saare 1s 1's complement ka NEGATIVE ZERO hai: value 0.") : L('Value = -' + (-val) + '. (Weights: -(2^' + (n - 1) + ' - 1) + rest = -' + (pow2(n - 1) - 1) + ' + ' + fromBits(b.slice(1)) + '.)', 'Value = -' + (-val) + '. (Weights: -(2^' + (n - 1) + ' - 1) + baaki = -' + (pow2(n - 1) - 1) + ' + ' + fromBits(b.slice(1)) + '.)'));
      } else {
        out.push(L('Sign-magnitude: MSB 1 = minus sign, the other ' + (n - 1) + ' bits are the magnitude ' + bstr(b.slice(1)) + ' = ' + fromBits(b.slice(1)) + '.', 'Sign-magnitude: MSB 1 = minus, baaki ' + (n - 1) + ' bits magnitude ' + bstr(b.slice(1)) + ' = ' + fromBits(b.slice(1)) + '.'));
        if (val === 0) out.push(L('1000...0 is sign-magnitude NEGATIVE ZERO: value 0.', '1000...0 sign-magnitude ka NEGATIVE ZERO hai: value 0.'));
      }
      out.push(L('Answer: ' + val, 'Answer: ' + val));
      return out;
    };
    q.revise = L('Decoding: MSB 1 -> 2\'s: invert+1 (or -2^(n-1) + rest), 1\'s: invert, SM: magnitude bits', 'Decode: MSB 1 -> 2\'s: invert+1 (ya -2^(n-1) + baaki), 1\'s: invert, SM: magnitude bits');
    return numQ(q);
  };

  K.range = function (level, L) {
    var rep = level === 1 ? '2c' : pick(['2c', '1c', 'sm']), n = level === 1 ? pick([4, 6, 8]) : pick([5, 6, 8, 10, 12, 16]);
    var ask = level === 1 ? pick(['min', 'max']) : pick(['min', 'max', 'count', 'min']);
    var rg = range(rep, n), cnt = rep === '2c' ? pow2(n) : pow2(n) - 1;
    var q = { kind: 'range', data: { rep: rep, n: n, ask: ask }, ans: ask === 'min' ? rg[0] : ask === 'max' ? rg[1] : cnt };
    q.text = ask === 'min' ? L('What is the MOST NEGATIVE value representable in ' + n + '-bit ' + REPN[rep] + '?', n + '-bit ' + REPN[rep] + ' me sabse NEGATIVE value kaunsi represent hoti hai?')
      : ask === 'max' ? L('What is the LARGEST value representable in ' + n + '-bit ' + REPN[rep] + '?', n + '-bit ' + REPN[rep] + ' me sabse BADI value kya hai?')
        : L('How many DISTINCT integer values can ' + n + '-bit ' + REPN[rep] + ' represent?', n + '-bit ' + REPN[rep] + ' kitni ALAG integer values represent kar sakta hai?');
    q.hint = L("2's: -2^(n-1) ... 2^(n-1)-1. 1's and sign-magnitude: -(2^(n-1)-1) ... 2^(n-1)-1 with two zeros.", "2's: -2^(n-1) ... 2^(n-1)-1. 1's aur SM: -(2^(n-1)-1) ... 2^(n-1)-1, do zeros ke saath.");
    q.grid = { n: n, groups: groupsOf(n, 4), rows: [{ id: 'reg', label: L('Try', 'Try'), bits: toBits(0, n), edit: 'toggle' }], scratch: true, tools: true, signedRep: level === 1 ? rep : null };
    q.explain = function () {
      var lo = encode(rg[0], n, rep), hi = encode(rg[1], n, rep);
      var out = [L('Largest: 0 followed by all 1s = ' + nib(hi, 4) + ' = 2^' + (n - 1) + ' - 1 = ' + rg[1] + ' (same in all three).', 'Sabse bada: 0 ke baad saare 1 = ' + nib(hi, 4) + ' = 2^' + (n - 1) + ' - 1 = ' + rg[1] + ' (teeno me same).')];
      if (rep === '2c') out.push(L("Most negative in 2's complement: 1000...0 = " + nib(lo, 4) + ' = -2^' + (n - 1) + ' = ' + rg[0] + '. Only one zero, so all 2^' + n + ' = ' + pow2(n) + ' patterns are distinct values.', "2's complement me sabse negative: 1000...0 = " + nib(lo, 4) + ' = -2^' + (n - 1) + ' = ' + rg[0] + '. Sirf ek zero, toh saare 2^' + n + ' = ' + pow2(n) + ' patterns alag values.'));
      else out.push(L('Most negative in ' + REPN[rep] + ': ' + nib(lo, 4) + ' = -(2^' + (n - 1) + ' - 1) = ' + rg[0] + '. Zero has two patterns (+0 and -0), so only 2^' + n + ' - 1 = ' + cnt + ' distinct values.', REPN[rep] + ' me sabse negative: ' + nib(lo, 4) + ' = -(2^' + (n - 1) + ' - 1) = ' + rg[0] + '. Zero ke do patterns (+0 aur -0), isliye sirf 2^' + n + ' - 1 = ' + cnt + ' alag values.'));
      out.push(L('Answer: ' + q.ans, 'Answer: ' + q.ans));
      return out;
    };
    q.revise = L('Ranges: 2\'s [-2^(n-1), 2^(n-1)-1]; 1\'s/SM symmetric with two zeros', 'Ranges: 2\'s [-2^(n-1), 2^(n-1)-1]; 1\'s/SM symmetric, do zeros');
    return numQ(q);
  };

  function addData(level) {
    var n = level === 2 ? pick([4, 8, 8]) : pick([8, 16]), rg = range('2c', n), a, b;
    if (Math.random() < 0.5) { // same signs, large magnitude -> overflow likely
      var neg = Math.random() < 0.5;
      a = neg ? rnd(rg[0], Math.floor(rg[0] / 3)) : rnd(Math.floor(rg[1] / 3), rg[1]);
      b = neg ? rnd(rg[0], Math.floor(rg[0] / 3)) : rnd(Math.floor(rg[1] / 3), rg[1]);
    } else { a = rnd(rg[0], rg[1]); b = rnd(rg[0], rg[1]); }
    var A = encode(a, n, '2c'), B = encode(b, n, '2c'), S = [], cin = [], c = 0;
    for (var i = n - 1; i >= 0; i--) { cin[i] = c; var t = A[i] + B[i] + c; S[i] = t % 2; c = t >> 1; }
    var cout = c, cMSB = cin[0], V = cMSB ^ cout;
    return { n: n, a: a, b: b, A: A, B: B, S: S, cin: cin, C: cout, cMSB: cMSB, V: V, r: decode(S, '2c') };
  }
  function addTable(d) {
    var n = d.n;
    return ['carry  ' + d.C + ' ' + bstr(d.cin) + '   (' + 'first digit = carry OUT of MSB; then carry INTO each column)',
      'A        ' + bstr(d.A) + '   (' + signed(d.a) + ')',
      'B      + ' + bstr(d.B) + '   (' + signed(d.b) + ')',
      '         ' + '-'.repeat(n),
      'sum      ' + bstr(d.S) + '   (as signed: ' + d.r + ')'].join('\n');
  }
  function addExplain(d, L) {
    var t = d.a + d.b, out = [{ c: addTable(d) }];
    out.push(L('Carry into MSB = ' + d.cMSB + ', carry out of MSB = C = ' + d.C + '. Overflow V = carry-in(MSB) XOR carry-out(MSB) = ' + d.cMSB + ' XOR ' + d.C + ' = ' + d.V + '.',
      'MSB me carry IN = ' + d.cMSB + ', MSB se carry OUT = C = ' + d.C + '. Overflow V = carry-in(MSB) XOR carry-out(MSB) = ' + d.cMSB + ' XOR ' + d.C + ' = ' + d.V + '.'));
    out.push(d.V ? L('Check: true sum ' + d.a + ' + ' + d.b + ' = ' + t + ' lies outside [' + range('2c', d.n).join(', ') + '], so the ' + d.n + '-bit result ' + d.r + ' is wrong - overflow. (Both operands have the same sign but the result sign differs.)',
      'Check: asli sum ' + d.a + ' + ' + d.b + ' = ' + t + ' range [' + range('2c', d.n).join(', ') + '] ke bahar hai, toh ' + d.n + '-bit result ' + d.r + ' galat hai - overflow. (Dono operands ka sign same, result ka sign alag.)')
      : L('Check: true sum ' + d.a + ' + ' + d.b + ' = ' + t + ' fits in [' + range('2c', d.n).join(', ') + '], so no overflow' + (d.C ? '. C = 1 here is just the discarded end carry - it does NOT mean signed overflow.' : '.'),
        'Check: asli sum ' + d.a + ' + ' + d.b + ' = ' + t + ' range [' + range('2c', d.n).join(', ') + '] me hai, toh overflow nahi' + (d.C ? '. Yahan C = 1 sirf discard hone wala end carry hai - signed overflow NAHI.' : '.')));
    return out;
  }
  function addGrid(d, L) {
    var n = d.n;
    return { n: n, groups: groupsOf(n, 4), rows: [{ id: 'A', label: 'A', bits: d.A }, { id: 'B', label: 'B', bits: d.B }, { id: 'cy', label: L('Carry', 'Carry'), bits: toBits(0, n), edit: 'toggle' }, { id: 'sum', label: L('Sum', 'Sum'), bits: toBits(0, n), edit: 'toggle' }], scratch: true };
  }
  K.ovf = function (level, L) {
    var d = addData(level), hex = level === 3 && d.n === 16;
    var q = { kind: 'ovf', data: d, ans: d.C * 2 + d.V };
    var sa = hex ? '0x' + hexOf(d.A) : nib(d.A, 4), sb = hex ? '0x' + hexOf(d.B) : nib(d.B, 4);
    var decs = level === 2 ? ' (' + signed(d.a) + ', ' + signed(d.b) + ')' : '';
    q.text = L('In ' + d.n + "-bit 2's complement, add A = " + sa + ' and B = ' + sb + decs + '. What are the carry-out C (from the MSB) and the overflow flag V?',
      d.n + "-bit 2's complement me A = " + sa + ' aur B = ' + sb + decs + ' add karo. MSB se carry-out C aur overflow flag V kya honge?');
    q.hint = L('V = carry into MSB XOR carry out of MSB. Use the Carry and Sum rows as scratch.', 'V = MSB me carry-in XOR MSB se carry-out. Carry aur Sum rows ko rough kaam ke liye use karo.');
    q.grid = addGrid(d, L);
    q.explain = function () { var o = []; if (hex) o.push(L('Hex to binary: A = ' + nib(d.A, 4) + ', B = ' + nib(d.B, 4) + '.', 'Hex se binary: A = ' + nib(d.A, 4) + ', B = ' + nib(d.B, 4) + '.')); return o.concat(addExplain(d, L), [L('Answer: ' + q.answerText, 'Answer: ' + q.answerText)]); };
    q.revise = L('Signed overflow V = Cin(MSB) XOR Cout(MSB); carry-out alone is not overflow', 'Signed overflow V = Cin(MSB) XOR Cout(MSB); sirf carry-out overflow nahi hai');
    return choiceQ(q, ['C = 0, V = 0', 'C = 0, V = 1', 'C = 1, V = 0', 'C = 1, V = 1']);
  };
  K.addval = function (level, L) {
    var d = addData(level), q = { kind: 'addval', data: d, ans: d.r };
    q.text = L('A ' + d.n + "-bit 2's complement adder computes " + signed(d.a) + ' + ' + signed(d.b) + '. What signed decimal value is left in the ' + d.n + '-bit result register (ignore any flags)?',
      d.n + "-bit 2's complement adder " + signed(d.a) + ' + ' + signed(d.b) + ' compute karta hai. ' + d.n + '-bit result register me kaunsi signed decimal value bachegi (flags ignore karo)?');
    q.hint = L('Encode both, add in binary, drop the carry out of the MSB, decode the ' + d.n + ' bits.', 'Dono encode karo, binary add karo, MSB ka carry-out chhod do, ' + d.n + ' bits decode karo.');
    q.grid = addGrid(d, L);
    q.explain = function () {
      return [L(signed(d.a) + ' = ' + nib(d.A, 4) + ',  ' + signed(d.b) + ' = ' + nib(d.B, 4) + '.', signed(d.a) + ' = ' + nib(d.A, 4) + ',  ' + signed(d.b) + ' = ' + nib(d.B, 4) + '.')]
        .concat(addExplain(d, L), [L('The register keeps only ' + d.n + ' bits: ' + nib(d.S, 4) + ' = ' + d.r + (d.V ? ' (wrapped around: ' + (d.a + d.b) + (d.a + d.b > 0 ? ' - ' : ' + ') + pow2(d.n) + ' = ' + d.r + ').' : '.'),
          'Register sirf ' + d.n + ' bits rakhta hai: ' + nib(d.S, 4) + ' = ' + d.r + (d.V ? ' (wrap-around: ' + (d.a + d.b) + (d.a + d.b > 0 ? ' - ' : ' + ') + pow2(d.n) + ' = ' + d.r + ').' : '.'))]);
    };
    q.revise = L('Overflowed results wrap around modulo 2^n', 'Overflow wala result 2^n modulo wrap hota hai');
    return numQ(q);
  };

  K.fixed = function (level, L) {
    var n = 8, f = pick([2, 3, 4]), sg = Math.random() < 0.6, b = toBits(rnd(0, 255), n);
    if (sg && Math.random() < 0.7) b[0] = 1;
    var iv = sg ? decode(b, '2c') : fromBits(b), val = iv / pow2(f);
    var q = { kind: 'fixed', data: { b: b, f: f, sg: sg }, ans: val };
    var shown = bstr(b.slice(0, n - f)) + '.' + bstr(b.slice(n - f));
    q.text = L('An 8-bit fixed-point number has ' + f + ' fraction bits (' + (sg ? "signed, 2's complement" : 'unsigned') + '). The stored bits are ' + shown + ' (binary point shown). What decimal value is it?',
      'Ek 8-bit fixed-point number me ' + f + ' fraction bits hain (' + (sg ? "signed, 2's complement" : 'unsigned') + '). Stored bits ' + shown + ' hain (binary point dikhaya hai). Decimal value kya hai?');
    q.hint = L('Value = (the 8 bits read as an integer) / 2^' + f + '.', 'Value = (8 bits ko integer ki tarah padho) / 2^' + f + '.');
    q.grid = { n: n, groups: [{ size: n - f, label: L('integer', 'integer') }, { size: f, label: L('fraction', 'fraction') }], rows: [{ id: 'reg', label: 'Reg', bits: b.slice(), edit: 'toggle' }], scratch: true, tools: sg };
    q.explain = function () {
      var out = [L('Ignore the point: ' + bstr(b) + ' as ' + (sg ? "a signed 2's complement" : 'an unsigned') + ' integer = ' + iv + '.', 'Point ignore karo: ' + bstr(b) + ' ' + (sg ? "signed 2's complement" : 'unsigned') + ' integer = ' + iv + '.')];
      if (sg && b[0]) out.push({ c: 'invert ' + bstr(inv(b)) + '\n+1     ' + bstr(plus1(inv(b))) + ' = ' + (-iv) + '  -> ' + iv });
      out.push(L('Divide by 2^' + f + ' = ' + pow2(f) + ': ' + iv + ' / ' + pow2(f) + ' = ' + val + '. (Fraction bit weights are 1/2, 1/4, 1/8, 1/16.)', '2^' + f + ' = ' + pow2(f) + ' se divide: ' + iv + ' / ' + pow2(f) + ' = ' + val + '. (Fraction bits ki weights 1/2, 1/4, 1/8, 1/16.)'));
      return out;
    };
    q.revise = L('Fixed point value = integer value / 2^(fraction bits)', 'Fixed point value = integer value / 2^(fraction bits)');
    return numQ(q);
  };

  function ieeeDecodeSteps(g, L) {
    var b = g.bits, e = fromBits(b.slice(1, 9)), fr = g.k ? g.top.toString(2).padStart(g.k, '0') : '';
    return [
      L('Hex to binary (4 bits per digit), then split 1 | 8 | 23:', 'Hex se binary (har digit 4 bits), phir 1 | 8 | 23 me baanto:'),
      { c: '0x' + hexOf(b) + ' = ' + nib(b, 4) + '\nsign = ' + b[0] + '   exponent = ' + bstr(b.slice(1, 9)) + '   fraction = ' + bstr(b.slice(9)) },
      L('Exponent field = ' + e + ', so E = ' + e + ' - 127 = ' + g.E + '. Normalized, so put the hidden 1 in front: significand = 1.' + (fr || '0') + '₂ = ' + (1 + g.top / pow2(g.k)) + '.',
        'Exponent field = ' + e + ', toh E = ' + e + ' - 127 = ' + g.E + '. Normalized hai, toh hidden 1 aage lagao: significand = 1.' + (fr || '0') + '₂ = ' + (1 + g.top / pow2(g.k)) + '.'),
      L('Value = ' + (g.s ? '-' : '+') + '1.' + (fr || '0') + '₂ x 2^' + g.E + ' = ' + (g.s ? '-' : '') + shifted(g.k, g.top, g.E) + '₂ = ' + g.value + '.',
        'Value = ' + (g.s ? '-' : '+') + '1.' + (fr || '0') + '₂ x 2^' + g.E + ' = ' + (g.s ? '-' : '') + shifted(g.k, g.top, g.E) + '₂ = ' + g.value + '.')
    ];
  }

  K.ieeeDec = function (level, L) {
    var g = genIEEE(), q = { kind: 'ieeeDec', data: g, ans: g.value };
    q.text = L('A float (IEEE-754 single precision) is stored as 0x' + hexOf(g.bits) + '. What decimal value is it? (It is exact - e.g. -12.5)', 'Ek float (IEEE-754 single precision) 0x' + hexOf(g.bits) + ' ke roop me stored hai. Iski decimal value kya hai? (Exact hai - jaise -12.5)');
    q.hint = L('Value = (-1)^S x 1.F x 2^(exp - 127).', 'Value = (-1)^S x 1.F x 2^(exp - 127).');
    q.grid = { n: 32, groups: ieeeGroups(L), rows: [{ id: 'reg', label: 'Bits', bits: g.bits.slice(), edit: 'toggle' }], scratch: true, ieee: true };
    q.explain = function () { return ieeeDecodeSteps(g, L); };
    q.revise = L('IEEE-754 decode: (-1)^S x 1.F x 2^(E-127)', 'IEEE-754 decode: (-1)^S x 1.F x 2^(E-127)');
    return numQ(q);
  };

  function ieeeEncodeSteps(g, L) {
    var fr = g.k ? g.top.toString(2).padStart(g.k, '0') : '';
    var mag = Math.abs(g.value), ip = Math.floor(mag), fp = mag - ip, fsteps = [], x = fp;
    while (x > 0 && fsteps.length < 12) { var y = x * 2, d = y >= 1 ? 1 : 0; fsteps.push(x + ' x 2 = ' + y + ' -> ' + d); x = y - d; }
    return [
      L('Sign bit = ' + g.s + '. Convert |' + g.value + '| = ' + mag + ' to binary: integer part ' + ip + ' = ' + ip.toString(2) + '₂' + (fp ? '; fraction part by repeated x2:' : '.'), 'Sign bit = ' + g.s + '. |' + g.value + '| = ' + mag + ' ko binary me: integer part ' + ip + ' = ' + ip.toString(2) + '₂' + (fp ? '; fraction part baar baar x2 karke:' : '.')),
      fsteps.length ? { c: fsteps.join('\n') } : '',
      L('So ' + mag + ' = ' + shifted(g.k, g.top, g.E) + '₂ = 1.' + (fr || '0') + '₂ x 2^' + g.E + ' (move the point until one 1 is left of it).', 'Toh ' + mag + ' = ' + shifted(g.k, g.top, g.E) + '₂ = 1.' + (fr || '0') + '₂ x 2^' + g.E + ' (point tab tak khisko jab tak uske left me ek 1 bache).'),
      L('Exponent field = E + 127 = ' + g.E + ' + 127 = ' + (g.E + 127) + ' = ' + bstr(toBits(g.E + 127, 8)) + '. Fraction = the bits after the point, padded with zeros to 23 bits (the leading 1 is hidden, not stored).', 'Exponent field = E + 127 = ' + g.E + ' + 127 = ' + (g.E + 127) + ' = ' + bstr(toBits(g.E + 127, 8)) + '. Fraction = point ke baad ke bits, 23 bits tak zeros se pad (leading 1 hidden hai, store nahi hota).'),
      { c: 'S | exponent | fraction\n' + g.s + ' | ' + bstr(g.bits.slice(1, 9)) + ' | ' + bstr(g.bits.slice(9)) + '\n= ' + nib(g.bits, 4) + '\n= 0x' + hexOf(g.bits) }
    ].filter(function (x) { return x !== ''; });
  }

  K.ieeeEnc = function (level, L) {
    var g = genIEEE(), q = { kind: 'ieeeEnc', data: g, ans: g.bits };
    q.text = L('Encode ' + g.value + ' as an IEEE-754 single-precision float. Flip the 32 cells, or type 8 hex digits.', g.value + ' ko IEEE-754 single precision float me encode karo. 32 cells flip karo, ya 8 hex digits type karo.');
    q.hint = L('Normalize to 1.F x 2^E, store E + 127 and the 23 bits of F.', '1.F x 2^E me normalize karo, E + 127 aur F ke 23 bits store karo.');
    q.grid = { n: 32, groups: ieeeGroups(L), rows: [{ id: 'ans', label: 'Ans', bits: toBits(0, 32), edit: 'toggle' }], ans: 'ans', ieee: true, hexText: true };
    q.explain = function () { return ieeeEncodeSteps(g, L); };
    q.revise = L('IEEE-754 encode: normalize, biased exponent E+127, hidden 1 not stored', 'IEEE-754 encode: normalize, biased exponent E+127, hidden 1 store nahi hota');
    return bitsQ(q, true);
  };

  K.ieeeExp = function (level, L) {
    var g = genIEEE(), q = { kind: 'ieeeExp', data: g, ans: g.E + 127 };
    q.text = L('In IEEE-754 single precision, what is the 8-bit (biased) exponent field of ' + g.value + ', written in decimal?', 'IEEE-754 single precision me ' + g.value + ' ka 8-bit (biased) exponent field decimal me kya hoga?');
    q.hint = L('Find E with 1 <= |x| / 2^E < 2, then add 127.', 'E aisa dhoondo ki 1 <= |x| / 2^E < 2, phir 127 jodo.');
    q.grid = { n: 8, groups: [{ size: 8, label: 'exponent' }], rows: [{ id: 'reg', label: 'Exp', bits: toBits(0, 8), edit: 'toggle' }], scratch: true };
    q.explain = function () {
      var m = Math.abs(g.value);
      return [L('|x| = ' + m + ' = ' + shifted(g.k, g.top, g.E) + '₂. Normalize: 1.' + ((g.k ? g.top.toString(2).padStart(g.k, '0') : '') || '0') + '₂ x 2^' + g.E + ' (check: 2^' + g.E + ' = ' + pow2(g.E) + ' <= ' + m + ' < ' + pow2(g.E + 1) + ').',
        '|x| = ' + m + ' = ' + shifted(g.k, g.top, g.E) + '₂. Normalize: 1.' + ((g.k ? g.top.toString(2).padStart(g.k, '0') : '') || '0') + '₂ x 2^' + g.E + ' (check: 2^' + g.E + ' = ' + pow2(g.E) + ' <= ' + m + ' < ' + pow2(g.E + 1) + ').'),
        L('Biased exponent = E + 127 = ' + g.E + ' + 127 = ' + q.ans + ' = ' + bstr(toBits(q.ans, 8)) + '₂. The sign does not affect the exponent.', 'Biased exponent = E + 127 = ' + g.E + ' + 127 = ' + q.ans + ' = ' + bstr(toBits(q.ans, 8)) + '₂. Sign ka exponent par koi asar nahi.')];
    };
    q.revise = L('Biased exponent = E + 127 (single), E + 1023 (double)', 'Biased exponent = E + 127 (single), E + 1023 (double)');
    return numQ(q);
  };

  var CATS = ['+0', '-0', '+Infinity', '-Infinity', 'NaN', 'Denormalized (subnormal)', 'Normalized number'];
  function ieeeCategory(b) {
    var e = fromBits(b.slice(1, 9)), f = fromBits(b.slice(9));
    if (e === 255) return f ? 4 : (b[0] ? 3 : 2);
    if (e === 0) return f ? 5 : (b[0] ? 1 : 0);
    return 6;
  }
  K.ieeeSpecial = function (level, L) {
    var want = rnd(0, 6), s = rnd(0, 1), e, f;
    if (want === 0 || want === 1) { e = 0; f = 0; s = want; }
    else if (want === 2 || want === 3) { e = 255; f = 0; s = want - 2; }
    else if (want === 4) { e = 255; f = pick([pow2(22), rnd(1, pow2(23) - 1), 1]); }
    else if (want === 5) { e = 0; f = pick([1, pow2(22), rnd(1, pow2(23) - 1)]); }
    else { e = pick([1, 254, 127, rnd(1, 254)]); f = rnd(0, pow2(23) - 1); }
    var b = ieeeBits(s, e, toBits(f, 23)), q = { kind: 'ieeeSpecial', data: { bits: b }, ans: ieeeCategory(b) };
    q.text = L('What does the single-precision pattern 0x' + hexOf(b) + ' represent?', 'Single-precision pattern 0x' + hexOf(b) + ' kya represent karta hai?');
    q.hint = L('Look at the exponent field first: all 0s or all 1s are special.', 'Pehle exponent field dekho: saare 0 ya saare 1 special hain.');
    q.grid = { n: 32, groups: ieeeGroups(L), rows: [{ id: 'reg', label: 'Bits', bits: b.slice() }], ieee: true };
    q.explain = function () {
      var out = [{ c: '0x' + hexOf(b) + ' = ' + nib(b, 4) + '\nsign = ' + b[0] + '   exponent = ' + bstr(b.slice(1, 9)) + ' (' + e + ')   fraction ' + (f ? '!= 0' : '= 0') }];
      out.push({ c: 'exponent 0,    fraction 0   -> +/-0\nexponent 0,    fraction !=0 -> denormal: (-1)^S x 0.F x 2^-126\nexponent 1-254               -> normal:   (-1)^S x 1.F x 2^(E-127)\nexponent 255,  fraction 0   -> +/-Infinity\nexponent 255,  fraction !=0 -> NaN' });
      out.push(L('Here: ' + CATS[q.ans] + '.', 'Yahan: ' + CATS[q.ans] + '.'));
      return out;
    };
    q.revise = L('IEEE special patterns: exp 0 (zero/denormal), exp 255 (Inf/NaN)', 'IEEE special patterns: exp 0 (zero/denormal), exp 255 (Inf/NaN)');
    return choiceQ(q, CATS);
  };

  var KINDS = {
    1: ['conv', 'conv', 'conv', 'enc', 'enc', 'dec', 'dec', 'range'],
    2: ['conv', 'enc', 'enc', 'dec', 'dec', 'range', 'ovf', 'ovf', 'addval', 'fixed'],
    3: ['dec', 'ovf', 'addval', 'range', 'ieeeDec', 'ieeeDec', 'ieeeEnc', 'ieeeEnc', 'ieeeExp', 'ieeeSpecial', 'fixed']
  };
  function makeQuestion(level, lang, avoid) {
    var kind; do { kind = pick(KINDS[level]); } while (kind === avoid);
    var q = K[kind](level, Lf(lang)); q.kind = kind; return q;
  }

  /* ---------------- UI ---------------- */
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined && text !== null) e.textContent = text; return e; }

  var CSS = [
    '.g-ID{display:flex;flex-direction:column;gap:16px}',
    '.g-ID .g-grids{display:flex;flex-wrap:wrap;gap:12px 18px;overflow-x:auto;padding-bottom:2px}',
    '.g-ID .g-grp{display:grid;gap:3px;align-items:center}',
    '.g-ID .g-ghead{font:600 .7rem var(--f-mono);color:var(--muted);letter-spacing:.04em}',
    '.g-ID .g-lab{font:600 .68rem var(--f-mono);color:var(--muted);padding-right:4px;white-space:nowrap}',
    '.g-ID .g-dec{font:600 .75rem var(--f-mono);color:var(--muted);padding-left:4px;min-width:26px}',
    '.g-ID .g-cell{width:20px;height:28px;display:grid;place-items:center;border:1px solid var(--line);border-radius:4px;font:600 .8rem var(--f-mono);background:var(--sheet);color:var(--ink);padding:0}',
    '.g-ID button.g-cell{cursor:pointer}',
    '.g-ID button.g-cell:hover{border-color:var(--pen)}',
    '.g-ID .g-cell.on{background:var(--pen);color:var(--pen-ink);border-color:var(--pen)}',
    '.g-ID .g-cell.sgn{box-shadow:inset 0 -3px 0 var(--marker)}',
    '.g-ID .g-readout{font:600 .82rem var(--f-mono);color:var(--muted);overflow-wrap:anywhere}',
    '.g-ID .g-lv[aria-pressed="true"]{background:var(--pen);color:var(--pen-ink);border-color:var(--pen)}',
    '.g-ID .g-ans{font:600 1.05rem var(--f-mono);width:min(100%,300px)}',
    '.g-ID .g-field{display:flex;flex-direction:column;gap:4px;font-size:.85rem;font-weight:600}',
    '.g-ID details.g-how summary{cursor:pointer;font-weight:700}',
    '.g-ID details.g-how ul{margin:8px 0 0;padding-left:1.2em;display:flex;flex-direction:column;gap:4px}',
    '.g-ID .g-hint{border-left:3px solid var(--marker);padding-left:10px;font-size:.92rem}',
    '.g-ID .g-sumscore{font:800 2.2rem var(--f-display);line-height:1}',
    '.g-ID .g-choice.picked{outline:2px solid var(--ink)}',
    '.g-ID .g-work{display:flex;flex-direction:column;gap:8px}'
  ].join('\n').replace(/ID/g, ID);
  function injectStyle() {
    if (document.getElementById('g-style-' + ID)) return;
    var s = document.createElement('style'); s.id = 'g-style-' + ID; s.textContent = CSS; document.head.appendChild(s);
  }

  /* Bit grid: groups of <=8 bits, several rows (fixed or 'toggle'). */
  function BitGrid(cfg) {
    var state = {}, wrap = el('div', 'g-grids');
    cfg.rows.forEach(function (r) { state[r.id] = r.bits.slice(); });
    function click(r, i) { state[r.id][i] ^= 1; render(r.id + ':' + i); if (cfg.onChange) cfg.onChange(r.id, state[r.id].slice()); }
    function render(focusKey) {
      wrap.textContent = '';
      var off = 0, toFocus = null;
      cfg.groups.forEach(function (g, gi) {
        var grp = el('div', 'g-grp');
        grp.style.gridTemplateColumns = 'auto repeat(' + g.size + ',20px) auto';
        if (g.label) { var head = el('div', 'g-ghead', g.label); head.style.gridColumn = '1 / -1'; grp.appendChild(head); }
        cfg.rows.forEach(function (r) {
          grp.appendChild(el('div', 'g-lab', r.label));
          for (var i = off; i < off + g.size; i++) {
            var bit = state[r.id][i], c;
            if (r.edit) {
              c = el('button', 'g-cell'); c.type = 'button';
              c.setAttribute('aria-label', r.label + ' bit ' + (cfg.n - 1 - i) + ' = ' + bit);
              (function (rr, ii) { c.addEventListener('click', function () { click(rr, ii); }); })(r, i);
              if (focusKey === r.id + ':' + i) toFocus = c;
            } else c = el('div', 'g-cell');
            c.textContent = bit;
            if (bit) c.className += ' on';
            if (i === 0 && cfg.markMSB) c.className += ' sgn';
            grp.appendChild(c);
          }
          grp.appendChild(el('div', 'g-dec', cfg.decOf ? cfg.decOf(r.id, state[r.id].slice(off, off + g.size), gi) : ''));
        });
        wrap.appendChild(grp); off += g.size;
      });
      if (toFocus) toFocus.focus();
      if (cfg.onRender) cfg.onRender(state);
    }
    render();
    return { el: wrap, get: function (id) { return state[id].slice(); }, set: function (id, bits) { state[id] = bits.slice(); render(); if (cfg.onChange) cfg.onChange(id, bits.slice(), true); } };
  }

  function bitsWidget(q, level, L, input) {
    var G = q.grid, box = el('div', 'g-work');
    var editRows = G.rows.filter(function (r) { return r.edit; });
    var toolRow = G.ans || (editRows.length === 1 ? editRows[0].id : null);
    var readout = el('div', 'g-readout');
    function toText(bits) {
      if (q.type === 'base') return toBase(fromBits(bits), q.base).s;
      if (G.hexText) return hexOf(bits);
      return bstr(bits);
    }
    var grid = BitGrid({
      n: G.n, groups: G.groups, rows: G.rows, markMSB: !G.ieee && q.kind !== 'conv',
      decOf: function (id, bits, gi) {
        if (G.ieee) return gi === 1 ? '=' + fromBits(bits) : '';
        if (G.dec === 16) return DIG[fromBits(bits)];
        if (G.dec === 8) return DIG[fromBits(bits)];
        return '';
      },
      onChange: function (id, bits, fromInput) { if (!fromInput && id === G.ans && input) input.value = toText(bits); },
      onRender: function (st) {
        var parts = [];
        if (level === 1 && G.sumAt1 && toolRow) {
          var b = st[toolRow];
          parts.push(L('unsigned value = ', 'unsigned value = ') + fromBits(b));
        }
        if (G.signedRep && toolRow) parts.push(REPN[G.signedRep] + ' = ' + decode(st[toolRow], G.signedRep));
        if (G.ieee && toolRow) {
          parts.push('hex 0x' + hexOf(st[toolRow]));
        }
        readout.textContent = parts.join('   |   ');
      }
    });
    box.appendChild(grid.el);
    if (G.weights) box.appendChild(el('div', 'g-readout', L('bit weights: ', 'bit weights: ') + G.weights));
    box.appendChild(readout);
    if (G.tools && toolRow) {
      var tr = el('div', 'row');
      [[L('Invert all', 'Sab invert'), function (b) { return inv(b); }], ['+1', function (b) { return plus1(b); }],
        [L('Reset', 'Reset'), function () { return G.rows.filter(function (r) { return r.id === toolRow; })[0].bits.slice(); }]].forEach(function (t) {
        var btn = el('button', 'btn', t[0]); btn.type = 'button';
        btn.addEventListener('click', function () { var nb = t[1](grid.get(toolRow)); grid.set(toolRow, nb); if (toolRow === G.ans && input) input.value = toText(nb); });
        tr.appendChild(btn);
      });
      box.appendChild(tr);
    }
    if (G.ans && input) {
      input.addEventListener('input', function () {
        var bits = null;
        if (q.type === 'base') { var v = parseBase(input.value, q.base); if (v !== null && v < pow2(G.n)) bits = toBits(v, G.n); }
        else bits = q.parse(input.value);
        if (bits) grid.set(G.ans, bits);
      });
      box.appendChild(el('div', 'small muted', L('Cells and the answer box stay in sync - flip bits or type.', 'Cells aur answer box sync me hain - bits flip karo ya type karo.')));
    } else if (G.scratch) box.appendChild(el('div', 'small muted', L('Scratch register: flip bits freely to work it out; type the answer below.', 'Rough register: bits flip karke kaam karo; answer neeche type karo.')));
    return box;
  }

  function howItWorks(L) {
    return [
      L('Base conversion: decimal -> base b by repeated division (remainders bottom-up); base b -> decimal by place values; binary <-> hex/octal by grouping 4/3 bits from the right.', 'Base conversion: decimal -> base b baar baar divide karke (remainders neeche se upar); base b -> decimal place values se; binary <-> hex/octal right se 4/3 bits ke groups.'),
      L("n-bit 2's complement: -x = invert(x) + 1. Range -2^(n-1) ... 2^(n-1) - 1. MSB weight is -2^(n-1).", "n-bit 2's complement: -x = invert(x) + 1. Range -2^(n-1) ... 2^(n-1) - 1. MSB ki weight -2^(n-1)."),
      L("1's complement: -x = invert(x). Sign-magnitude: MSB sign + magnitude. Both: range +/-(2^(n-1) - 1), two zeros.", "1's complement: -x = invert(x). Sign-magnitude: MSB sign + magnitude. Dono: range +/-(2^(n-1) - 1), do zeros."),
      L('Signed overflow on addition: V = carry into MSB XOR carry out of MSB (same-sign operands, different-sign result). Carry out alone is NOT overflow.', 'Addition me signed overflow: V = MSB me carry-in XOR MSB se carry-out (same sign operands, result ka sign alag). Sirf carry-out overflow NAHI.'),
      L('Fixed point with f fraction bits: value = integer / 2^f.', 'f fraction bits wala fixed point: value = integer / 2^f.'),
      L('IEEE-754 single: 1 sign | 8 exponent (bias 127) | 23 fraction. Normal: (-1)^S x 1.F x 2^(E-127). E = 0: zero / denormal (0.F x 2^-126). E = 255: Infinity (F = 0) or NaN.', 'IEEE-754 single: 1 sign | 8 exponent (bias 127) | 23 fraction. Normal: (-1)^S x 1.F x 2^(E-127). E = 0: zero / denormal (0.F x 2^-126). E = 255: Infinity (F = 0) ya NaN.')
    ];
  }

  function mount(root, api) {
    injectStyle();
    var lang = function () { try { return api && api.lang && api.lang() === 'hinglish' ? 'hi' : 'en'; } catch (e) { return 'en'; } };
    var T = function (en, hi) { return lang() === 'hi' ? hi : en; };
    var TOTAL = 10, level = 1, idx = 0, correct = 0, t0 = 0, timer = null, cur = null, locked = false, wrongs = [], lastKind = null;
    root.textContent = '';
    var box = el('div', 'g-' + ID); root.appendChild(box);

    var head = el('div', 'panel'); box.appendChild(head);
    head.appendChild(el('h2', null, GAME.title));
    head.appendChild(el('p', 'muted small', GAME.blurb)).style.margin = '0';
    var lvRow = el('div', 'row'); head.appendChild(lvRow);
    lvRow.appendChild(el('span', 'small muted', 'Level'));
    var lvNames = ['1 · Learn', '2 · Practice', '3 · GATE'];
    var lvBtns = [1, 2, 3].map(function (n) {
      var b = el('button', 'btn g-lv', lvNames[n - 1]); b.type = 'button';
      b.addEventListener('click', function () { level = n; startRound(); });
      lvRow.appendChild(b); return b;
    });
    var stat = el('div', 'row'); head.appendChild(stat);
    var cQ = el('span', 'chip'), cS = el('span', 'chip plain'), cT = el('span', 'chip plain');
    stat.appendChild(cQ); stat.appendChild(cS); stat.appendChild(cT);

    var how = el('details', 'panel g-how'); box.appendChild(how);
    var card = el('div', 'panel'); box.appendChild(card);
    var sum = el('div', 'panel'); box.appendChild(sum);

    function fmt(s) { return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
    function secs() { return Math.round((Date.now() - t0) / 1000); }
    function tick() { cT.textContent = 'Time ' + fmt(secs()); }
    function status() {
      cQ.textContent = 'Q ' + Math.min(idx + 1, TOTAL) + ' / ' + TOTAL;
      cS.textContent = 'Score ' + correct;
      lvBtns.forEach(function (b, i) { b.setAttribute('aria-pressed', String(i + 1 === level)); });
      tick();
    }
    function renderHow() {
      how.textContent = '';
      how.appendChild(el('summary', null, T('How it works', 'Yeh kaise kaam karta hai')));
      var ul = el('ul', 'small'); howItWorks(T).forEach(function (s) { ul.appendChild(el('li', null, s)); });
      how.appendChild(ul);
      how.open = level === 1;
    }
    function startRound() {
      idx = 0; correct = 0; wrongs = []; lastKind = null; t0 = Date.now();
      clearInterval(timer); timer = setInterval(tick, 1000);
      sum.hidden = true; card.hidden = false; renderHow(); showQ();
    }
    function showQ() {
      locked = false;
      cur = makeQuestion(level, lang(), lastKind); lastKind = cur.kind;
      status(); card.textContent = '';
      card.appendChild(el('div', 'qtext', cur.text));
      if (level === 1 && cur.hint) card.appendChild(el('div', 'g-hint', 'Hint: ' + cur.hint));
      var input = null, lab = null, fb = el('div');
      if (cur.type !== 'choice') {
        lab = el('label', 'g-field');
        var labText = cur.type === 'num' ? T('Your answer (decimal number)', 'Aapka answer (decimal number)')
          : cur.type === 'base' ? T('Your answer (base ' + cur.base + ')', 'Aapka answer (base ' + cur.base + ')')
            : cur.hexOk ? T('Your answer (8 hex digits or 32 bits)', 'Aapka answer (8 hex digits ya 32 bits)') : T('Your answer (' + cur.ans.length + ' bits)', 'Aapka answer (' + cur.ans.length + ' bits)');
        lab.appendChild(el('span', null, labText));
        input = el('input', 'g-ans'); input.type = 'text'; input.autocomplete = 'off'; input.spellcheck = false;
        if (cur.type === 'num') input.inputMode = 'decimal';
        lab.appendChild(input);
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(input.value); } });
      }
      if (cur.grid) card.appendChild(bitsWidget(cur, level, T, input));
      if (input) {
        var sb = el('button', 'btn primary', T('Check', 'Check karo')); sb.type = 'button';
        sb.addEventListener('click', function () { submit(input.value); });
        var ar = el('div', 'row'); ar.style.alignItems = 'flex-end';
        ar.appendChild(lab); ar.appendChild(sb); card.appendChild(ar);
      } else {
        var cr = el('div', 'row'); card.appendChild(cr);
        cur.choices.forEach(function (c, i) {
          var b = el('button', 'btn g-choice', c); b.type = 'button';
          b.addEventListener('click', function () { if (!locked) { b.classList.add('picked'); submit(i); } });
          cr.appendChild(b);
        });
      }
      card.appendChild(fb);
      card._fb = fb;
      if (input) input.focus({ preventScroll: true });
    }
    function submit(val) {
      if (locked) return;
      if (typeof val === 'string' && !val.trim()) return;
      locked = true;
      var ok = !!cur.check(val);
      if (ok) correct++; else wrongs.push(cur.revise);
      Array.prototype.forEach.call(card.querySelectorAll('button, input'), function (b) { b.disabled = true; });
      var fb = card._fb; fb.className = 'feedback ' + (ok ? 'ok' : 'bad'); fb.textContent = '';
      fb.appendChild(el('div', 'verdict', ok ? T('✓ Correct', '✓ Sahi') : T('✗ Not quite - correct answer: ', '✗ Galat - sahi answer: ') + cur.answerText));
      cur.explain().forEach(function (b) { fb.appendChild(typeof b === 'string' ? el('div', 'exp', b) : el('pre', 'code', b.c)); });
      if (!ok) fb.appendChild(el('div', 'exp', T('Rule to remember: ', 'Yaad rakho: ') + cur.revise));
      var nb = el('button', 'btn primary', idx + 1 < TOTAL ? T('Next question', 'Agla sawaal') : T('See result', 'Result dekho')); nb.type = 'button';
      nb.addEventListener('click', function () { idx++; if (idx < TOTAL) showQ(); else finish(); });
      var r = el('div', 'row'); r.appendChild(nb); fb.appendChild(r);
      status(); nb.focus({ preventScroll: true });
    }
    function finish() {
      clearInterval(timer);
      var s = secs();
      try { if (api && api.done) api.done({ correct: correct, total: TOTAL, level: level, seconds: s }); } catch (e) { /* host error must not break the game */ }
      card.hidden = true; sum.hidden = false; sum.textContent = '';
      sum.appendChild(el('h3', null, T('Round complete - level ', 'Round khatam - level ') + level));
      sum.appendChild(el('div', 'g-sumscore', correct + ' / ' + TOTAL));
      sum.appendChild(el('div', 'muted', 'Time: ' + fmt(s)));
      var uniq = wrongs.filter(function (w, i) { return wrongs.indexOf(w) === i; });
      if (uniq.length) {
        sum.appendChild(el('div', 'exp', T('Revise these:', 'Inhe revise karo:')));
        var ul = el('ul', 'small'); uniq.forEach(function (w) { ul.appendChild(el('li', null, w)); }); sum.appendChild(ul);
      } else sum.appendChild(el('div', 'exp', T('Perfect round - nothing to revise.', 'Perfect round - kuch revise nahi karna.')));
      var r = el('div', 'row'); sum.appendChild(r);
      var again = el('button', 'btn', T('Play again', 'Phir se khelo')); again.type = 'button';
      again.addEventListener('click', startRound); r.appendChild(again);
      var nx = el('button', 'btn primary', level < 3 ? T('Next level', 'Agla level') : T('Play GATE level again', 'GATE level phir se')); nx.type = 'button';
      nx.addEventListener('click', function () { if (level < 3) level++; startRound(); }); r.appendChild(nx);
      status(); cQ.textContent = TOTAL + ' / ' + TOTAL;
    }
    startRound();
    return function () { clearInterval(timer); root.textContent = ''; };
  }

  var GAME = {
    id: ID,
    title: 'Bit Flipper',
    subj: 'dl',
    topics: ["2's complement & signed number representation", 'Number systems & base conversion', 'Floating point (IEEE 754) & fixed point'],
    blurb: "Flip bits to convert bases, encode 2's complement, spot overflow and decode IEEE-754 floats - GATE asks one of these almost every year.",
    mount: mount,
    _core: { K: K, KINDS: KINDS, makeQuestion: makeQuestion, encode: encode, decode: decode, range: range, toBits: toBits, fromBits: fromBits, hexOf: hexOf, ieeeValue: ieeeValue, ieeeCategory: ieeeCategory, parseNum: parseNum, parseBase: parseBase, CATS: CATS }
  };
  (window.GATE_GAMES = window.GATE_GAMES || []).push(GAME);
})();
