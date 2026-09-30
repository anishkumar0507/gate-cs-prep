/* Subnet Sniper — GATE CS Prep Desk concept game (Computer Networks).
   Subnetting, CIDR, aggregation, longest-prefix match and IPv4 fragmentation.
   Plain JS, no libraries, no network. See games/GAMES.md for the contract. */
(function () {
  'use strict';
  var ID = 'subnetting';

  /* ---------------- pure helpers ---------------- */
  var M32 = 0xFFFFFFFF;
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function maskOf(p) { return p <= 0 ? 0 : (p >= 32 ? M32 : ((M32 << (32 - p)) >>> 0)); }
  function octs(n) { return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; }
  function dot(n) { return octs(n).join('.'); }
  function b8(x) { return x.toString(2).padStart(8, '0'); }
  function bdot(n) { return octs(n).map(b8).join('.'); }
  function bitsOf(n) { var a = []; for (var i = 31; i >= 0; i--) a.push((n >>> i) & 1); return a; }
  function numOf(bits) { var v = 0; for (var i = 0; i < bits.length; i++) v = v * 2 + bits[i]; return v >>> 0; }
  function fromOcts(o) { return ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0; }
  function parseIP(s) {
    var m = String(s).trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) return null;
    var o = m.slice(1).map(Number);
    if (o.some(function (x) { return x > 255; })) return null;
    return fromOcts(o);
  }
  function parseCIDR(s) {
    var m = String(s).trim().match(/^(.+?)\s*\/\s*(\d{1,2})$/);
    if (!m) return null;
    var ip = parseIP(m[1]), p = +m[2];
    if (ip === null || p > 32) return null;
    return { ip: ip, p: p };
  }
  function parseNum(s) {
    var t = String(s).replace(/[,\s]/g, '').replace(/^\//, '');
    if (!/^[-+]?\d+(\.\d+)?$/.test(t)) return null;
    return Number(t);
  }
  function net(ip, p) { return (ip & maskOf(p)) >>> 0; }
  function bcast(ip, p) { return (net(ip, p) | ((~maskOf(p)) >>> 0)) >>> 0; }
  function pow2(k) { return Math.pow(2, k); }
  function clog2(x) { var k = 0; while (pow2(k) < x) k++; return k; }

  function randomIP() {
    var t = rnd(0, 3), a;
    if (t === 0) return fromOcts([10, rnd(0, 255), rnd(0, 255), rnd(0, 255)]);
    if (t === 1) return fromOcts([172, rnd(16, 31), rnd(0, 255), rnd(0, 255)]);
    if (t === 2) return fromOcts([192, 168, rnd(0, 255), rnd(0, 255)]);
    do { a = rnd(1, 223); } while (a === 127 || a === 10);
    return fromOcts([a, rnd(0, 255), rnd(0, 255), rnd(0, 255)]);
  }
  function hostIP(p) {
    var ip;
    do { ip = randomIP(); } while (p <= 30 && (ip === net(ip, p) || ip === bcast(ip, p)));
    return ip;
  }
  function prefixFor(level) {
    if (level === 1) return pick([24, 25, 26, 27, 28, 29, 30]);
    if (level === 2) return pick([16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);
    return pick([9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30]);
  }

  /* ---------------- explanation builders ---------------- */
  function row(label, n) { return label.padEnd(11) + dot(n).padEnd(16) + bdot(n); }
  var RULE = '-'.repeat(62);
  function andCode(ip, p, label) {
    return [row(label || 'IP', ip), row('Mask /' + p, maskOf(p)), RULE, row('AND', net(ip, p))].join('\n');
  }
  function orCode(ip, p) {
    var n = net(ip, p);
    return [row('Network', n), row('NOT mask', (~maskOf(p)) >>> 0), RULE, row('OR', bcast(ip, p))].join('\n');
  }
  function trick(ip, p, L) {
    if (p % 8 === 0) {
      return L('Prefix /' + p + ' is a multiple of 8, so whole octets are network or host: keep the first ' + (p / 8) + ' octet(s), host octets become 0 (network) or 255 (broadcast).',
        'Prefix /' + p + ' 8 ka multiple hai, toh poore octets network ya host hain: pehle ' + (p / 8) + ' octet(s) same rakho, host octets network me 0 aur broadcast me 255.');
    }
    var i = p >> 3, mo = octs(maskOf(p))[i], blk = 256 - mo, v = octs(ip)[i], lo = Math.floor(v / blk) * blk, hi = lo + blk - 1;
    return L('Shortcut: the boundary is inside octet ' + (i + 1) + '. Mask octet = ' + mo + ', block size = 256 - ' + mo + ' = ' + blk + '. ' + v + ' lies in ' + lo + '-' + hi +
        ', so that octet is ' + lo + ' in the network address and ' + hi + ' in the broadcast. Bitwise: ' + b8(v) + ' AND ' + b8(mo) + ' = ' + b8(lo) + ' (' + lo + '). Octets after it: 0 for network, 255 for broadcast.',
      'Shortcut: boundary octet ' + (i + 1) + ' ke andar hai. Mask octet = ' + mo + ', block size = 256 - ' + mo + ' = ' + blk + '. ' + v + ' range ' + lo + '-' + hi +
        ' me aata hai, toh network me yeh octet ' + lo + ' aur broadcast me ' + hi + '. Bitwise: ' + b8(v) + ' AND ' + b8(mo) + ' = ' + b8(lo) + ' (' + lo + '). Uske baad ke octets: network me 0, broadcast me 255.');
  }
  function lenStr(p) { return p + ' network bits + ' + (32 - p) + ' host bits'; }

  /* ---------------- question kinds ---------------- */
  function Lf(lang) { return function (en, hi) { return lang === 'hi' ? hi : en; }; }
  function ipQ(q) { q.type = 'ip'; q.check = function (v) { return parseIP(v) === q.ans; }; q.answerText = dot(q.ans); return q; }
  function numQ(q) { q.type = 'num'; q.check = function (v) { var x = parseNum(v); return x !== null && x === q.ans; }; q.answerText = String(q.ans); return q; }
  function choiceQ(q, choices) { q.type = 'choice'; q.choices = choices; q.check = function (i) { return i === q.ans; }; q.answerText = choices[q.ans]; return q; }
  function yn(L) { return [L('Yes', 'Haan (Yes)'), L('No', 'Nahi (No)')]; }

  var K = {};

  K.net = function (level, L) {
    var p = prefixFor(level), ip = hostIP(p), q = { kind: 'net', data: { ip: ip, p: p }, ans: net(ip, p) };
    q.text = L('Host ' + dot(ip) + '/' + p + '. What is its network (subnet) address?',
      'Host ' + dot(ip) + '/' + p + ' diya hai. Iska network (subnet) address kya hoga?');
    q.hint = L('Network address = IP AND mask. Keep the network bits, make every host bit 0.', 'Network address = IP AND mask. Network bits same rakho, saare host bits 0 kar do.');
    q.strip = { rows: [['IP', ip]], mask: p, ansInit: ip };
    q.explain = function () {
      return [L('/' + p + ' means ' + lenStr(p) + '. AND the address with the mask bit by bit (1 AND x = x, 0 AND x = 0):', '/' + p + ' ka matlab ' + lenStr(p) + '. Address ko mask ke saath bit-by-bit AND karo (1 AND x = x, 0 AND x = 0):'),
        { c: andCode(ip, p) }, trick(ip, p, L),
        L('Network address = ' + dot(q.ans), 'Network address = ' + dot(q.ans))];
    };
    q.revise = L('Network address = IP AND mask (host bits -> 0)', 'Network address = IP AND mask (host bits -> 0)');
    return ipQ(q);
  };

  K.bc = function (level, L) {
    var p = prefixFor(level), ip = hostIP(p), q = { kind: 'bc', data: { ip: ip, p: p }, ans: bcast(ip, p) };
    q.text = L('Host ' + dot(ip) + '/' + p + '. What is the directed broadcast address of its subnet?',
      'Host ' + dot(ip) + '/' + p + '. Iske subnet ka (directed) broadcast address kya hai?');
    q.hint = L('Broadcast = network bits unchanged, every host bit set to 1.', 'Broadcast = network bits same, saare host bits 1.');
    q.strip = { rows: [['IP', ip]], mask: p, ansInit: ip };
    q.explain = function () {
      return [L('Step 1: network address = IP AND mask.', 'Step 1: network address = IP AND mask.'), { c: andCode(ip, p) },
        L('Step 2: set all ' + (32 - p) + ' host bits to 1, i.e. network OR (NOT mask):', 'Step 2: saare ' + (32 - p) + ' host bits 1 karo, yaani network OR (NOT mask):'),
        { c: orCode(ip, p) }, trick(ip, p, L), L('Broadcast = ' + dot(q.ans), 'Broadcast = ' + dot(q.ans))];
    };
    q.revise = L('Broadcast = network OR NOT mask (host bits -> 1)', 'Broadcast = network OR NOT mask (host bits -> 1)');
    return ipQ(q);
  };

  function hostEnd(first) {
    return function (level, L) {
      var p = prefixFor(level), ip = hostIP(p), n = net(ip, p), b = bcast(ip, p);
      var q = { kind: first ? 'first' : 'last', data: { ip: ip, p: p }, ans: first ? n + 1 : b - 1 };
      q.text = first ? L('Host ' + dot(ip) + '/' + p + '. What is the FIRST usable host address in its subnet?', 'Host ' + dot(ip) + '/' + p + '. Iske subnet ka PEHLA usable host address kya hai?')
        : L('Host ' + dot(ip) + '/' + p + '. What is the LAST usable host address in its subnet?', 'Host ' + dot(ip) + '/' + p + '. Iske subnet ka AAKHRI usable host address kya hai?');
      q.hint = first ? L('First host = network address + 1.', 'First host = network address + 1.') : L('Last host = broadcast address - 1.', 'Last host = broadcast address - 1.');
      q.strip = { rows: [['IP', ip]], mask: p, ansInit: ip };
      q.explain = function () {
        return [L('Network = IP AND mask:', 'Network = IP AND mask:'), { c: andCode(ip, p) },
          L('Broadcast = host bits all 1:', 'Broadcast = saare host bits 1:'), { c: orCode(ip, p) }, trick(ip, p, L),
          first ? L('The network address itself is reserved, so first usable host = ' + dot(n) + ' + 1 = ' + dot(q.ans) + ' (host bits 000...01).', 'Network address khud reserved hai, isliye first usable = ' + dot(n) + ' + 1 = ' + dot(q.ans) + ' (host bits 000...01).')
            : L('The broadcast address is reserved, so last usable host = ' + dot(b) + ' - 1 = ' + dot(q.ans) + ' (host bits 111...10).', 'Broadcast address reserved hai, isliye last usable = ' + dot(b) + ' - 1 = ' + dot(q.ans) + ' (host bits 111...10).')];
      };
      q.revise = L('Usable range = network+1 ... broadcast-1', 'Usable range = network+1 ... broadcast-1');
      return ipQ(q);
    };
  }
  K.first = hostEnd(true);
  K.last = hostEnd(false);

  K.hosts = function (level, L) {
    var p = level === 1 ? pick([24, 25, 26, 27, 28, 29, 30]) : pick([12, 14, 16, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29]);
    var ip = hostIP(p), q = { kind: 'hosts', data: { p: p }, ans: pow2(32 - p) - 2 };
    q.text = L('A subnet is ' + dot(net(ip, p)) + '/' + p + '. How many usable host addresses does it have?', 'Subnet ' + dot(net(ip, p)) + '/' + p + ' hai. Isme kitne usable host addresses hain?');
    q.hint = L('Count the host bits h = 32 - prefix, then 2^h - 2.', 'Host bits h = 32 - prefix gino, phir 2^h - 2.');
    q.strip = { rows: [['IP', net(ip, p)]], mask: p };
    q.explain = function () {
      var h = 32 - p;
      return [L('Host bits h = 32 - ' + p + ' = ' + h + '.', 'Host bits h = 32 - ' + p + ' = ' + h + '.'),
        L('Total addresses = 2^' + h + ' = ' + pow2(h) + '. Two are reserved: host bits all 0 (network address) and all 1 (broadcast).', 'Total addresses = 2^' + h + ' = ' + pow2(h) + '. Do reserved hain: host bits sab 0 (network) aur sab 1 (broadcast).'),
        L('Usable hosts = 2^' + h + ' - 2 = ' + q.ans, 'Usable hosts = 2^' + h + ' - 2 = ' + q.ans)];
    };
    q.revise = L('Usable hosts = 2^(32-p) - 2', 'Usable hosts = 2^(32-p) - 2');
    return numQ(q);
  };

  K.mask = function (level, L) {
    var p = pick([8, 16, 20, 22, 24, 25, 26, 27, 28, 29, 30]), q = { kind: 'mask', data: { p: p }, ans: maskOf(p) };
    q.text = L('Write the subnet mask for /' + p + ' in dotted decimal.', '/' + p + ' ka subnet mask dotted decimal me likho.');
    q.hint = L('/' + p + ' = ' + p + ' ones followed by ' + (32 - p) + ' zeros. Toggle the Ans row bits or type it.', '/' + p + ' = ' + p + ' ones, phir ' + (32 - p) + ' zeros. Ans row ke bits toggle karo ya type karo.');
    q.strip = { rows: [], mask: 0, ansInit: 0 };
    q.explain = function () {
      var o = octs(q.ans);
      return [L('Write ' + p + ' ones then ' + (32 - p) + ' zeros, 8 bits per octet:', p + ' ones phir ' + (32 - p) + ' zeros likho, har octet me 8 bits:'), { c: bdot(q.ans) + '\n' + o.map(function (x) { return String(x).padStart(8); }).join(' ') },
        L('Useful octet values: 10000000=128, 11000000=192, 11100000=224, 11110000=240, 11111000=248, 11111100=252, 11111110=254.', 'Yaad rakho: 10000000=128, 11000000=192, 11100000=224, 11110000=240, 11111000=248, 11111100=252, 11111110=254.'),
        L('Mask = ' + dot(q.ans), 'Mask = ' + dot(q.ans))];
    };
    q.revise = L('Prefix -> dotted mask conversion', 'Prefix -> dotted mask conversion');
    return ipQ(q);
  };

  K.same = function (level, L) {
    var p = prefixFor(level); if (p > 29) p = 28;
    var a = hostIP(p), n = net(a, p), size = pow2(32 - p), b, same = Math.random() < 0.5;
    if (same) { do { b = n + rnd(1, size - 2); } while (b === a); }
    else {
      do { var bit = 32 - p + rnd(0, Math.min(3, p - 1)); b = (a ^ (1 << bit)) >>> 0; b = net(b, p) + rnd(1, size - 2); } while (b === a || (b >>> 24) === 0 || (b >>> 24) === 127 || (b >>> 24) > 223);
    }
    var useDotted = level >= 2 && Math.random() < 0.5;
    var q = { kind: 'same', data: { a: a, b: b, p: p }, ans: net(a, p) === net(b, p) ? 0 : 1 };
    var mtxt = useDotted ? 'mask ' + dot(maskOf(p)) : '/' + p;
    q.text = L('Hosts A = ' + dot(a) + ' and B = ' + dot(b) + ', both with ' + mtxt + '. Are they on the same subnet?', 'Host A = ' + dot(a) + ' aur B = ' + dot(b) + ', dono ka ' + mtxt + '. Kya dono same subnet me hain?');
    q.hint = L('Same subnet <=> (A AND mask) == (B AND mask).', 'Same subnet <=> (A AND mask) == (B AND mask).');
    q.strip = { rows: [['A', a], ['B', b]], mask: p };
    q.explain = function () {
      var out = [];
      if (useDotted) out.push(L(dot(maskOf(p)) + ' = ' + bdot(maskOf(p)) + ' = /' + p + '.', dot(maskOf(p)) + ' = ' + bdot(maskOf(p)) + ' = /' + p + '.'));
      out.push({ c: andCode(a, p, 'A') }, { c: andCode(b, p, 'B') });
      out.push(q.ans === 0 ? L('Both give ' + dot(net(a, p)) + ', so YES, same subnet.', 'Dono ka result ' + dot(net(a, p)) + ' hai, toh HAAN, same subnet.')
        : L('A gives ' + dot(net(a, p)) + ' but B gives ' + dot(net(b, p)) + ' - the network parts differ, so NO (a router is needed between them).', 'A ka ' + dot(net(a, p)) + ' aur B ka ' + dot(net(b, p)) + ' - network part alag hai, toh NAHI (beech me router chahiye).'));
      return out;
    };
    q.revise = L('Same subnet test: compare IP AND mask', 'Same subnet test: IP AND mask compare karo');
    return choiceQ(q, yn(L));
  };

  K.which = function (level, L) {
    var p = level === 3 ? pick([12, 14, 16, 18, 20, 22, 23, 24]) : pick([16, 20, 22, 24]);
    var k = rnd(1, Math.min(level === 3 ? 5 : 4, 30 - p)), np = p + k;
    var base = net(randomIP(), p), a;
    do { a = base + rnd(1, pow2(32 - p) - 2); } while (a === net(a, np) || a === bcast(a, np));
    var q = { kind: 'which', data: { a: a, p: p, k: k }, ans: net(a, np) };
    q.text = L('Network ' + dot(base) + '/' + p + ' is split into ' + pow2(k) + ' equal subnets. What is the subnet (network) address of the subnet containing ' + dot(a) + '?',
      'Network ' + dot(base) + '/' + p + ' ko ' + pow2(k) + ' barabar subnets me toda gaya. ' + dot(a) + ' jis subnet me hai uska subnet (network) address kya hai?');
    q.hint = L(pow2(k) + ' subnets need ' + k + ' borrowed bits, so the new prefix is /' + np + '.', pow2(k) + ' subnets ke liye ' + k + ' bits borrow, naya prefix /' + np + '.');
    q.strip = { rows: [['IP', a]], mask: p, ansInit: a };
    q.explain = function () {
      var idx = (a - base) / pow2(32 - np);
      return [L(pow2(k) + ' = 2^' + k + ' subnets -> borrow ' + k + ' host bits -> new prefix /' + p + '+' + k + ' = /' + np + ' (each subnet has 2^' + (32 - np) + ' = ' + pow2(32 - np) + ' addresses).',
        pow2(k) + ' = 2^' + k + ' subnets -> ' + k + ' host bits borrow -> naya prefix /' + p + '+' + k + ' = /' + np + ' (har subnet me 2^' + (32 - np) + ' = ' + pow2(32 - np) + ' addresses).'),
        L('AND the address with the NEW mask:', 'Address ko NAYE mask se AND karo:'), { c: andCode(a, np) }, trick(a, np, L),
        L('Subnet address = ' + dot(q.ans) + ' (it is subnet number ' + idx + ', counting from 0; the ' + k + ' borrowed bits = ' + idx.toString(2).padStart(k, '0') + ').',
          'Subnet address = ' + dot(q.ans) + ' (yeh subnet number ' + idx + ' hai, 0 se ginte hue; borrowed ' + k + ' bits = ' + idx.toString(2).padStart(k, '0') + ').')];
    };
    q.revise = L('Splitting into 2^k subnets: new prefix = p + k', '2^k subnets me todna: naya prefix = p + k');
    return ipQ(q);
  };

  K.borrow = function (level, L) {
    var p = pick([16, 18, 20, 21, 22, 23, 24]), k = rnd(1, Math.min(level === 3 ? 6 : 4, 30 - p));
    var S = k === 1 ? 2 : rnd(pow2(k - 1) + 1, pow2(k));
    var base = net(randomIP(), p), q = { kind: 'borrow', data: { p: p, S: S }, ans: pow2(32 - p - k) - 2 };
    q.text = L('An organisation owns ' + dot(base) + '/' + p + ' and needs at least ' + S + ' equal-size subnets. What is the maximum number of usable hosts per subnet?',
      'Ek organisation ke paas ' + dot(base) + '/' + p + ' hai aur use kam se kam ' + S + ' barabar subnets chahiye. Har subnet me maximum kitne usable hosts ho sakte hain?');
    q.hint = L('Borrow the fewest bits k with 2^k >= ' + S + '.', 'Sabse kam bits k borrow karo jahan 2^k >= ' + S + '.');
    q.strip = { rows: [['Net', base]], mask: p };
    q.explain = function () {
      return [L('Smallest k with 2^k >= ' + S + ': k = ' + k + ' (2^' + k + ' = ' + pow2(k) + ').', '2^k >= ' + S + ' ke liye sabse chhota k = ' + k + ' (2^' + k + ' = ' + pow2(k) + ').'),
        L('New prefix = ' + p + ' + ' + k + ' = /' + (p + k) + ', host bits left = 32 - ' + (p + k) + ' = ' + (32 - p - k) + '.', 'Naya prefix = ' + p + ' + ' + k + ' = /' + (p + k) + ', bache host bits = 32 - ' + (p + k) + ' = ' + (32 - p - k) + '.'),
        L('Usable hosts per subnet = 2^' + (32 - p - k) + ' - 2 = ' + q.ans + '.', 'Har subnet me usable hosts = 2^' + (32 - p - k) + ' - 2 = ' + q.ans + '.')];
    };
    q.revise = L('Borrow k = ceil(log2 S) bits; hosts = 2^(32-p-k) - 2', 'k = ceil(log2 S) bits borrow; hosts = 2^(32-p-k) - 2');
    return numQ(q);
  };

  K.need = function (level, L) {
    var N = level === 3 ? rnd(3, 16000) : rnd(3, 1000);
    if (Math.random() < 0.3) N = pow2(rnd(2, level === 3 ? 13 : 9)) - pick([1, 2, 0]); // edge cases around powers of two
    if (N < 2) N = 2;
    var h = clog2(N + 2), q = { kind: 'need', data: { N: N }, ans: 32 - h };
    q.text = L('A LAN needs ' + N + ' usable host addresses. What is the LONGEST prefix length (smallest subnet) that fits? Answer as a number, e.g. 26.',
      'Ek LAN ko ' + N + ' usable host addresses chahiye. Sabse LAMBA prefix (sabse chhota subnet) kya hoga jo fit ho? Number me likho, jaise 26.');
    q.hint = L('Need 2^h - 2 >= ' + N + '; prefix = 32 - h.', '2^h - 2 >= ' + N + ' chahiye; prefix = 32 - h.');
    q.strip = { rows: [], mask: 0 };
    q.explain = function () {
      return [L('Find the smallest h with 2^h - 2 >= ' + N + ' (the -2 is for the network and broadcast addresses).', 'Sabse chhota h dhoondo jahan 2^h - 2 >= ' + N + ' (-2 network aur broadcast ke liye).'),
        L('h = ' + (h - 1) + ' gives ' + (pow2(h - 1) - 2) + ' hosts (too few); h = ' + h + ' gives ' + (pow2(h) - 2) + ' hosts (enough).', 'h = ' + (h - 1) + ' se ' + (pow2(h - 1) - 2) + ' hosts (kam); h = ' + h + ' se ' + (pow2(h) - 2) + ' hosts (kaafi).'),
        L('Prefix = 32 - ' + h + ' = /' + q.ans + '.', 'Prefix = 32 - ' + h + ' = /' + q.ans + '.')];
    };
    q.revise = L('Hosts needed -> prefix: smallest h with 2^h - 2 >= N', 'Hosts se prefix: sabse chhota h jahan 2^h - 2 >= N');
    return numQ(q);
  };

  function blockSet(forceAlign) {
    var qp = rnd(18, 27), size = pow2(32 - qp), m, start;
    if (forceAlign === undefined) { m = pick([2, 3, 4, 5, 6, 8]); }
    else m = pick([2, 4, 8]);
    var big = net(randomIP(), qp - 4);
    var j = forceAlign === true ? m * rnd(0, Math.floor(16 / m) - 1) : (forceAlign === false ? (m * rnd(0, Math.floor(16 / m) - 1) + rnd(1, m - 1)) : rnd(0, 16 - m));
    if (j + m > 16) j = 16 - m;
    start = big + j * size;
    return { qp: qp, size: size, m: m, start: start >>> 0, end: (start + m * size - 1) >>> 0 };
  }
  function blockList(B) { var a = []; for (var i = 0; i < B.m; i++) a.push(dot(B.start + i * B.size) + '/' + B.qp); return a; }
  function commonPrefix(a, b) { var p = 0; while (p < 32 && ((a >>> (31 - p)) & 1) === ((b >>> (31 - p)) & 1)) p++; return p; }

  K.agg = function (level, L) {
    var B = blockSet(), p = commonPrefix(B.start, B.end), q = { kind: 'agg', data: B, ans: { ip: net(B.start, p), p: p } };
    q.text = L('A router must advertise ONE route covering all of these blocks. What is the smallest single CIDR block that contains them all? Answer like 10.1.0.0/22.',
      'Router ko in sab blocks ke liye EK hi route advertise karna hai. Sabse chhota single CIDR block kya hai jo sabko cover kare? Aise likho: 10.1.0.0/22.');
    q.pre = blockList(B).join('\n');
    q.hint = L('Write the first and last address in binary; the common leading bits are the prefix.', 'Pehla aur aakhri address binary me likho; common leading bits hi prefix hain.');
    q.strip = { rows: [['First', B.start], ['Last', B.end]], mask: 0 };
    q.type = 'cidr';
    q.check = function (v) { var c = parseCIDR(v); return !!c && c.p === p && c.ip === q.ans.ip; };
    q.answerText = dot(q.ans.ip) + '/' + p;
    q.explain = function () {
      var cover = pow2(32 - p), need = B.m * B.size;
      return [L('First address = ' + dot(B.start) + ', last address = ' + dot(B.end) + ' (last block + ' + (B.size - 1) + ').', 'Pehla address = ' + dot(B.start) + ', aakhri = ' + dot(B.end) + ' (last block + ' + (B.size - 1) + ').'),
        { c: row('First', B.start) + '\n' + row('Last', B.end) + '\n' + ' '.repeat(27) + bdot(maskOf(p)).replace(/1/g, '^').replace(/0/g, ' ') },
        L('They agree on the first ' + p + ' bits (marked ^), so the smallest covering block is /' + p + ': ' + dot(q.ans.ip) + '/' + p + '.', 'Pehle ' + p + ' bits same hain (^ se marked), toh sabse chhota covering block /' + p + ': ' + dot(q.ans.ip) + '/' + p + '.'),
        cover === need ? L('It holds exactly the ' + B.m + ' blocks - a perfect aggregate.', 'Isme exactly ' + B.m + ' blocks hain - perfect aggregate.')
          : L('It holds ' + cover / B.size + ' blocks of /' + B.qp + ' but only ' + B.m + ' are yours - the summary also covers ' + (cover - need) + ' extra addresses (that is why GATE asks about alignment).', 'Isme /' + B.qp + ' ke ' + cover / B.size + ' blocks aate hain par aapke sirf ' + B.m + ' hain - summary ' + (cover - need) + ' extra addresses bhi cover karti hai (isiliye GATE alignment poochta hai).')];
    };
    q.revise = L('CIDR aggregation = longest common prefix of first and last address', 'CIDR aggregation = pehle aur aakhri address ka longest common prefix');
    return q;
  };

  K.align = function (level, L) {
    var want = Math.random() < 0.5, B = blockSet(want);
    var total = B.m * B.size, ok = (B.m & (B.m - 1)) === 0 && B.start % total === 0;
    var q = { kind: 'align', data: B, ans: ok ? 0 : 1 };
    q.text = L('Can these ' + B.m + ' contiguous blocks be summarised into exactly ONE CIDR block with no extra addresses?', 'Kya yeh ' + B.m + ' contiguous blocks EK hi CIDR block me bina extra addresses ke summarise ho sakte hain?');
    q.pre = blockList(B).join('\n');
    q.hint = L('Need: count is a power of 2 AND the first address is a multiple of the total size.', 'Shart: count 2 ki power ho AUR pehla address total size ka multiple ho.');
    q.strip = { rows: [['First', B.start], ['Last', B.end]], mask: 0 };
    q.explain = function () {
      var k = clog2(B.m), np = B.qp - k, idx = (B.start - net(B.start, B.qp - 4)) / B.size;
      var out = [L(B.m + ' blocks of /' + B.qp + ' = ' + total + ' addresses. One CIDR block of that size would be /' + B.qp + '-' + k + ' = /' + np + ', which must start on a multiple of ' + total + '.',
        '/' + B.qp + ' ke ' + B.m + ' blocks = ' + total + ' addresses. Utne size ka ek CIDR block /' + B.qp + '-' + k + ' = /' + np + ' hoga, jo ' + total + ' ke multiple par shuru hona chahiye.')];
      if ((B.m & (B.m - 1)) !== 0) out.push(L(B.m + ' is not a power of 2, so no single block can have exactly this size -> NO.', B.m + ' 2 ki power nahi hai, toh koi single block exactly itna bada nahi ho sakta -> NAHI.'));
      else {
        out.push({ c: andCode(B.start, np, 'First') });
        out.push(ok ? L('First address AND /' + np + ' mask gives back the first address (its low ' + (32 - np) + ' bits are 0), so ' + dot(B.start) + '/' + np + ' is exactly these blocks -> YES.', 'First address AND /' + np + ' mask wahi address deta hai (neeche ke ' + (32 - np) + ' bits 0), toh ' + dot(B.start) + '/' + np + ' exactly yahi blocks hain -> HAAN.')
          : L('First address AND /' + np + ' mask = ' + dot(net(B.start, np)) + ', not the first address: the run starts at block #' + idx + ', which is not a multiple of ' + B.m + '. Misaligned -> NO (it needs 2+ routes).', 'First address AND /' + np + ' = ' + dot(net(B.start, np)) + ', first address nahi: run block #' + idx + ' se shuru hota hai jo ' + B.m + ' ka multiple nahi. Misaligned -> NAHI (2+ routes lagenge).'));
      }
      return out;
    };
    q.revise = L('Aggregation needs 2^k blocks AND alignment on 2^k x block size', 'Aggregation ke liye 2^k blocks AUR 2^k x block size par alignment');
    return choiceQ(q, yn(L));
  };

  K.lpm = function (level, L) {
    var D = randomIP(), names = shuffle(['eth0', 'eth1', 'eth2', 'eth3', 'eth4']);
    var lens = shuffle([8, 10, 12, 14, 16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]).slice(0, 4).sort(function (a, b) { return a - b; });
    var entries = [{ net: 0, p: 0, via: names[4] }];
    lens.forEach(function (len, i) {
      var match = Math.random() < 0.55, pre;
      if (!match) { var bit = 32 - len + rnd(0, Math.min(len - 1, 5)); pre = net((D ^ (1 << bit)) >>> 0, len); }
      else pre = net(D, len);
      entries.push({ net: pre, p: len, via: names[i] });
    });
    var best = entries.filter(function (e) { return net(D, e.p) === e.net; }).sort(function (a, b) { return b.p - a.p; })[0];
    var shown = shuffle(entries.slice());
    var choices = names.slice().sort();
    var q = { kind: 'lpm', data: { D: D, entries: entries }, ans: choices.indexOf(best.via) };
    q.text = L('Forwarding table below. On which interface is a packet to ' + dot(D) + ' sent?', 'Neeche forwarding table hai. ' + dot(D) + ' ke liye packet kis interface par jayega?');
    q.pre = 'Prefix'.padEnd(22) + 'Interface\n' + shown.map(function (e) { return (dot(e.net) + '/' + e.p).padEnd(22) + e.via; }).join('\n');
    q.hint = L('Check every entry: (dest AND mask) == prefix? Among matches take the longest.', 'Har entry check karo: (dest AND mask) == prefix? Match walon me sabse lamba lo.');
    q.strip = { rows: [['Dest', D]], mask: 0 };
    q.explain = function () {
      var lines = shown.slice().sort(function (a, b) { return b.p - a.p; }).map(function (e) {
        var m = net(D, e.p) === e.net;
        return ('/' + e.p).padEnd(4) + ' dest AND mask = ' + dot(net(D, e.p)).padEnd(16) + ' vs ' + dot(e.net).padEnd(16) + (m ? ' match ✓' : ' no ✗') + '  ' + e.via;
      });
      return [L('Destination ' + dot(D) + ' = ' + bdot(D) + '. Test each prefix, longest first:', 'Destination ' + dot(D) + ' = ' + bdot(D) + '. Har prefix test karo, sabse lambe se shuru:'),
        { c: lines.join('\n') },
        L('Longest matching prefix is ' + dot(best.net) + '/' + best.p + ' -> ' + best.via + '. Table order does not matter; the default route 0.0.0.0/0 matches everything but is used only when nothing longer matches.',
          'Sabse lamba matching prefix ' + dot(best.net) + '/' + best.p + ' -> ' + best.via + '. Table ka order matter nahi karta; default route 0.0.0.0/0 sabse match karta hai par tabhi use hota hai jab koi lamba match na ho.')];
    };
    q.revise = L('Longest-prefix match (default /0 only as last resort)', 'Longest-prefix match (default /0 sirf last resort)');
    return choiceQ(q, choices);
  };

  function fragPlan(T, M, O0, MF0, hdr) {
    // Every fragment but the last carries `per` bytes (a multiple of 8). The last one only has to
    // fit in the MTU (<= M - hdr bytes), it need not be a multiple of 8.
    var per = Math.floor((M - hdr) / 8) * 8, payload = T - hdr, fr = [], pos = 0;
    while (payload - pos > M - hdr) { fr.push({ data: per, len: per + hdr, off: O0 + pos / 8, mf: 1 }); pos += per; }
    fr.push({ data: payload - pos, len: payload - pos + hdr, off: O0 + pos / 8, mf: MF0 });
    return { per: per, payload: payload, n: fr.length, fr: fr };
  }
  K.frag = function (level, L) {
    var T, M, P, O0 = 0, MF0 = 0, hdr = 20;
    do {
      M = pick([576, 620, 820, 1006, 1024, 1280, 1420, 1500]);
      T = rnd(Math.floor(M * 1.2), M * 5);
      P = fragPlan(T, M, 0, 0, hdr);
    } while (P.n < 2 || P.n > 7);
    var twist = Math.random() < 0.3;
    if (twist) { O0 = rnd(20, 400); MF0 = 1; P = fragPlan(T, M, O0, MF0, hdr); }
    var sub = pick(['count', 'offset', 'offset', 'mf', 'lastlen']);
    var k = sub === 'mf' ? (twist && Math.random() < 0.6 ? P.n : rnd(1, P.n)) : (sub === 'offset' ? rnd(2, P.n) : P.n);
    var q = { kind: 'frag', data: { T: T, M: M, O0: O0, MF0: MF0, sub: sub, k: k } };
    var ctx = L('An IPv4 datagram of total length ' + T + ' bytes (20-byte header, DF = 0' + (twist ? ', and it is itself a fragment with offset field ' + O0 + ' and MF = 1' : '') + ') must cross a link with MTU ' + M + ' bytes. ',
      'Ek IPv4 datagram ki total length ' + T + ' bytes hai (20-byte header, DF = 0' + (twist ? ', aur yeh khud ek fragment hai jiska offset field ' + O0 + ' aur MF = 1' : '') + '), use MTU ' + M + ' bytes wale link se jaana hai. ');
    if (sub === 'count') { q.ans = P.n; q.text = ctx + L('How many fragments are produced?', 'Kitne fragments banenge?'); }
    if (sub === 'offset') { q.ans = P.fr[k - 1].off; q.text = ctx + L('What is the fragment offset FIELD value of fragment #' + k + '?', 'Fragment #' + k + ' ka fragment offset FIELD value kya hoga?'); }
    if (sub === 'lastlen') { q.ans = P.fr[P.n - 1].len; q.text = ctx + L('What is the total length (header + data) of the LAST fragment?', 'AAKHRI fragment ki total length (header + data) kya hogi?'); }
    if (sub === 'mf') { q.ans = P.fr[k - 1].mf; q.text = ctx + L('What is the MF (more fragments) flag of fragment #' + k + ' of the ' + P.n + '?', P.n + ' me se fragment #' + k + ' ka MF (more fragments) flag kya hoga?'); }
    q.hint = L('Data per fragment = floor((MTU - 20) / 8) x 8; offset is counted in 8-byte units.', 'Data per fragment = floor((MTU - 20) / 8) x 8; offset 8-byte units me.');
    q.explain = function () {
      var tbl = '#   data   total len   offset field   MF\n' + P.fr.map(function (f, i) {
        return String(i + 1).padEnd(4) + String(f.data).padEnd(7) + String(f.len).padEnd(12) + String(f.off).padEnd(15) + f.mf;
      }).join('\n');
      var out = [L('Payload = ' + T + ' - 20 = ' + P.payload + ' bytes.', 'Payload = ' + T + ' - 20 = ' + P.payload + ' bytes.'),
        L('Each fragment can carry at most ' + M + ' - 20 = ' + (M - 20) + ' data bytes, rounded DOWN to a multiple of 8 (offset is in 8-byte units): ' + P.per + ' bytes.', 'Har fragment max ' + M + ' - 20 = ' + (M - 20) + ' data bytes le sakta hai, 8 ke multiple me NEECHE round karo (offset 8-byte units me hai): ' + P.per + ' bytes.'),
        L('Cut ' + P.per + '-byte pieces until the rest fits in one fragment (<= ' + (M - 20) + ' bytes; only the LAST piece may be a non-multiple of 8): ' + P.n + ' fragments. Offset field = (' + (O0 ? O0 + ' x 8 + ' : '') + 'data bytes before it) / 8.',
          P.per + '-byte ke tukde kaato jab tak baaki ek fragment me fit na ho jaye (<= ' + (M - 20) + ' bytes; sirf AAKHRI tukda 8 ka non-multiple ho sakta hai): ' + P.n + ' fragments. Offset field = (' + (O0 ? O0 + ' x 8 + ' : '') + 'pehle ke data bytes) / 8.'),
        { c: tbl },
        twist ? L('Twist: the original was already a middle fragment (MF = 1), so even the last new fragment keeps MF = 1, and all offsets start from ' + O0 + '.', 'Twist: original khud beech ka fragment tha (MF = 1), toh aakhri naya fragment bhi MF = 1 rakhega, aur saare offsets ' + O0 + ' se shuru.')
          : L('MF = 1 on every fragment except the last one.', 'Aakhri fragment ko chhod kar sab par MF = 1.')];
      out.push(L('Answer: ' + q.answerText, 'Answer: ' + q.answerText));
      return out;
    };
    q.revise = L('IPv4 fragmentation: data multiple of 8, offset in 8-byte units, MF flag', 'IPv4 fragmentation: data 8 ka multiple, offset 8-byte units me, MF flag');
    if (sub === 'mf') { q.data.mf = q.ans; q.ans = q.data.mf === 1 ? 0 : 1; return choiceQ(q, ['MF = 1', 'MF = 0']); }
    return numQ(q);
  };

  var KINDS = {
    1: ['net', 'bc', 'first', 'last', 'hosts', 'mask', 'net', 'bc'],
    2: ['net', 'bc', 'first', 'last', 'hosts', 'same', 'which', 'borrow', 'need'],
    3: ['net', 'bc', 'which', 'same', 'need', 'agg', 'align', 'lpm', 'lpm', 'frag', 'frag']
  };
  function makeQuestion(level, lang, avoid) {
    var kind; do { kind = pick(KINDS[level]); } while (kind === avoid && KINDS[level].length > 1);
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
    '.g-ID .g-dec{font:600 .75rem var(--f-mono);color:var(--muted);padding-left:4px;min-width:34px}',
    '.g-ID .g-cell{width:20px;height:28px;display:grid;place-items:center;border:1px solid var(--line);border-radius:4px;font:600 .8rem var(--f-mono);background:var(--sheet);color:var(--ink);padding:0}',
    '.g-ID button.g-cell{cursor:pointer}',
    '.g-ID button.g-cell:hover{border-color:var(--pen)}',
    '.g-ID .g-cell.net{background:var(--pen-soft);border-color:var(--pen)}',
    '.g-ID .g-cell.host{background:var(--marker)}',
    '.g-ID .g-cell.on{background:var(--pen);color:var(--pen-ink);border-color:var(--pen)}',
    '.g-ID .g-readout{font:600 .82rem var(--f-mono);color:var(--muted)}',
    '.g-ID .g-lv[aria-pressed="true"]{background:var(--pen);color:var(--pen-ink);border-color:var(--pen)}',
    '.g-ID .g-ans{font:600 1.05rem var(--f-mono);width:min(100%,240px)}',
    '.g-ID .g-field{display:flex;flex-direction:column;gap:4px;font-size:.85rem;font-weight:600}',
    '.g-ID details.g-how summary{cursor:pointer;font-weight:700}',
    '.g-ID details.g-how ul{margin:8px 0 0;padding-left:1.2em;display:flex;flex-direction:column;gap:4px}',
    '.g-ID .g-hint{border-left:3px solid var(--marker);padding-left:10px;font-size:.92rem}',
    '.g-ID .g-sumscore{font:800 2.2rem var(--f-display);line-height:1}',
    '.g-ID .g-choice.picked{outline:2px solid var(--ink)}'
  ].join('\n').replace(/ID/g, ID);
  function injectStyle() {
    if (document.getElementById('g-style-' + ID)) return;
    var s = document.createElement('style'); s.id = 'g-style-' + ID; s.textContent = CSS; document.head.appendChild(s);
  }

  /* Bit grid: groups of <=8 bits, several rows (fixed / 'mask' boundary / 'toggle'). */
  function BitGrid(cfg) {
    var state = {}, wrap = el('div', 'g-grids');
    cfg.rows.forEach(function (r) { state[r.id] = r.bits.slice(); });
    function click(r, i) {
      var b = state[r.id];
      if (r.edit === 'mask') {
        var lastOne = b[i] === 1 && (i === b.length - 1 || b[i + 1] === 0);
        var p = lastOne ? i : i + 1;
        for (var j = 0; j < b.length; j++) b[j] = j < p ? 1 : 0;
      } else b[i] ^= 1;
      render(r.id + ':' + i);
      if (cfg.onChange) cfg.onChange(r.id, b.slice());
    }
    function render(focusKey) {
      wrap.textContent = '';
      var off = 0, toFocus = null;
      cfg.groups.forEach(function (g, gi) {
        var grp = el('div', 'g-grp');
        grp.style.gridTemplateColumns = 'auto repeat(' + g.size + ',20px) auto';
        var head = el('div', 'g-ghead', g.label); head.style.gridColumn = '1 / -1'; grp.appendChild(head);
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
            var extra = cfg.cls ? cfg.cls(r.id, i, bit, state) : '';
            if (extra) c.className += ' ' + extra;
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
    return { el: wrap, get: function (id) { return state[id].slice(); }, set: function (id, bits) { state[id] = bits.slice(); render(); } };
  }

  function subnetWidget(q, level, L, input) {
    var box = el('div', 'g-work');
    var rows = q.strip.rows.map(function (r, i) { return { id: 'r' + i, label: r[0], bits: bitsOf(r[1]) }; });
    var maskInit = level === 1 ? q.strip.mask : 0;
    rows.push({ id: 'mask', label: 'Mask', bits: bitsOf(maskOf(maskInit)), edit: 'mask' });
    var hasAns = q.type === 'ip' && q.strip.ansInit !== undefined;
    if (hasAns) rows.push({ id: 'ans', label: 'Ans', bits: bitsOf(q.strip.ansInit), edit: 'toggle' });
    var readout = el('div', 'g-readout');
    var grid = BitGrid({
      n: 32,
      groups: [0, 1, 2, 3].map(function (i) { return { size: 8, label: L('octet ', 'octet ') + (i + 1) }; }),
      rows: rows,
      cls: function (id, i, bit, st) {
        if (id === 'mask') return bit ? 'net' : '';
        if (id === 'ans') return bit ? 'on' : '';
        return st.mask[i] ? 'net' : 'host';
      },
      decOf: function (id, bits) { return '=' + numOf(bits); },
      onChange: function (id, bits) { if (id === 'ans' && input) input.value = dot(numOf(bits)); },
      onRender: function (st) {
        var m = st.mask, p = 0; while (p < 32 && m[p]) p++;
        readout.textContent = L('Mask row: /' + p + ' -> ' + p + ' network bits (shaded) | ' + (32 - p) + ' host bits (yellow). Click a mask bit to move the boundary there.',
          'Mask row: /' + p + ' -> ' + p + ' network bits (shaded) | ' + (32 - p) + ' host bits (peele). Mask bit par click karke boundary wahan le jao.');
      }
    });
    box.appendChild(grid.el); box.appendChild(readout);
    if (hasAns && input) {
      input.addEventListener('input', function () { var v = parseIP(input.value); if (v !== null) grid.set('ans', bitsOf(v)); });
      box.appendChild(el('div', 'small muted', L('Ans row: flip bits to build the answer address (it fills the box below), or just type it.', 'Ans row: bits flip karke answer address banao (neeche box me aa jayega), ya seedha type karo.')));
    }
    return box;
  }

  function howItWorks(L) {
    return [
      L('IPv4 address = 32 bits. /p means the first p bits are the network part, the last 32 - p bits are the host part.', 'IPv4 address = 32 bits. /p ka matlab pehle p bits network part, baaki 32 - p bits host part.'),
      L('Network address = IP AND mask. Broadcast = network OR (NOT mask) (host bits all 1).', 'Network address = IP AND mask. Broadcast = network OR (NOT mask) (saare host bits 1).'),
      L('Usable hosts = 2^(32 - p) - 2; first host = network + 1, last host = broadcast - 1.', 'Usable hosts = 2^(32 - p) - 2; first host = network + 1, last host = broadcast - 1.'),
      L('Shortcut: in the octet where the boundary falls, block size = 256 - mask octet; the network octet is the multiple of the block size just below the IP octet.', 'Shortcut: jis octet me boundary hai, wahan block size = 256 - mask octet; network octet = IP octet ke neeche wala block size ka multiple.'),
      L('Splitting into 2^k subnets borrows k bits: new prefix = p + k. Aggregation: 2^k blocks of /q form one /(q - k) only if the first one is aligned to 2^k blocks.', '2^k subnets = k bits borrow: naya prefix = p + k. Aggregation: /q ke 2^k blocks ek /(q - k) tabhi bante hain jab pehla block 2^k blocks par aligned ho.'),
      L('Longest-prefix match: of all entries with (dest AND mask) == prefix, use the longest; 0.0.0.0/0 is the fallback.', 'Longest-prefix match: jin entries me (dest AND mask) == prefix, unme sabse lamba prefix; 0.0.0.0/0 fallback hai.'),
      L('Fragmentation: data per fragment = floor((MTU - header)/8) x 8; offset field = bytes before / 8; MF = 1 on all but the last fragment.', 'Fragmentation: data per fragment = floor((MTU - header)/8) x 8; offset field = pehle ke bytes / 8; aakhri ko chhod sab par MF = 1.')
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
    function tick() { cT.textContent = T('Time ', 'Time ') + fmt(secs()); }
    function status() {
      cQ.textContent = 'Q ' + Math.min(idx + 1, TOTAL) + ' / ' + TOTAL;
      cS.textContent = T('Score ', 'Score ') + correct;
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
      if (cur.pre) card.appendChild(el('pre', 'code', cur.pre));
      if (level === 1 && cur.hint) card.appendChild(el('div', 'g-hint', T('Hint: ', 'Hint: ') + cur.hint));
      var input = null, lab = null, fb = el('div');
      if (cur.type !== 'choice') {
        lab = el('label', 'g-field');
        var ph = { ip: 'e.g. 192.168.1.64', num: T('a number', 'ek number'), cidr: 'e.g. 10.1.0.0/22' }[cur.type];
        lab.appendChild(el('span', null, cur.type === 'num' ? T('Your answer (number)', 'Aapka answer (number)') : cur.type === 'cidr' ? T('Your answer (a.b.c.d/p)', 'Aapka answer (a.b.c.d/p)') : T('Your answer (dotted decimal)', 'Aapka answer (dotted decimal)')));
        input = el('input', 'g-ans'); input.type = 'text'; input.autocomplete = 'off'; input.spellcheck = false; input.placeholder = ph;
        if (cur.type === 'num') input.inputMode = 'numeric';
        lab.appendChild(input);
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); submit(input.value); } });
      }
      if (cur.strip) card.appendChild(subnetWidget(cur, level, T, input));
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
      fb.appendChild(el('div', 'verdict', ok ? T('✓ Correct', '✓ Sahi') : T('✗ Not quite - correct answer: ', '✗ Galat - sahi answer: ') + (ok ? '' : cur.answerText)));
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
      sum.appendChild(el('div', 'muted', T('Time: ', 'Time: ') + fmt(s)));
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
    title: 'Subnet Sniper',
    subj: 'cn',
    topics: ['Subnetting, CIDR & IP addressing', 'IPv4 header & fragmentation'],
    blurb: 'Network/broadcast addresses, host counts, CIDR aggregation, longest-prefix match and fragment offsets - a near-certain 1-2 marks in GATE CN.',
    mount: mount,
    _core: { K: K, KINDS: KINDS, makeQuestion: makeQuestion, parseIP: parseIP, parseCIDR: parseCIDR, parseNum: parseNum, dot: dot, maskOf: maskOf, fragPlan: fragPlan }
  };
  (window.GATE_GAMES = window.GATE_GAMES || []).push(GAME);
})();
