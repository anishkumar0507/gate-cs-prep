import json, re, sys
sys.stdout.reconfigure(encoding='utf-8')
BASE = r"C:\Users\manis\Desktop\GATE PREP\pyq"
raw = json.load(open(BASE + r"\topics_raw.json", encoding="utf-8"))

S = {}
S['dm'] = ([
 "Propositional logic", "First-order (predicate) logic", "Sets & relations", "Functions",
 "Partial orders & lattices", "Groups & algebraic structures", "Counting & combinatorics",
 "Recurrences & generating functions", "Graph theory (degree, connectivity, trees)",
 "Graph colouring, planarity & bipartite graphs", "Number theory & countability"], [
 (r"propositional", "Propositional logic"),
 (r"first.order|predicate", "First-order (predicate) logic"),
 (r"lattice|partial order|poset", "Partial orders & lattices"),
 (r"group|binary operation|monoid", "Groups & algebraic structures"),
 (r"generating|recurrence", "Recurrences & generating functions"),
 (r"colou?r|planar|bipartite", "Graph colouring, planarity & bipartite graphs"),
 (r"graph|tree|handshaking|degree", "Graph theory (degree, connectivity, trees)"),
 (r"counting|combinator|inclusion|permutation|surjection|onto", "Counting & combinatorics"),
 (r"function", "Functions"),
 (r"relation|set", "Sets & relations"),
 (r"countab|number|divisor|modular", "Number theory & countability")])

S['dl'] = ([
 "Boolean algebra & logic gates", "Canonical forms (SOP/POS) & minterms", "K-map & Boolean minimization",
 "Functional completeness & universal gates", "Combinational circuits (MUX, decoder, encoder)",
 "Adders & arithmetic circuits", "Flip-flops & latches", "Counters", "Sequential circuits & FSMs",
 "Number systems & base conversion", "2's complement & signed number representation",
 "Floating point (IEEE 754) & fixed point"], [
 (r"ieee|floating|fixed-point", "Floating point (IEEE 754) & fixed point"),
 (r"booth|adder|carry", "Adders & arithmetic circuits"),
 (r"2's complement|\bsign\b|sign-", "2's complement & signed number representation"),
 (r"number system|radix", "Number systems & base conversion"),
 (r"counter", "Counters"),
 (r"fsm|mealy|state|sequential", "Sequential circuits & FSMs"),
 (r"flip-flop|latch", "Flip-flops & latches"),
 (r"k-map|minimization|simplification|prime", "K-map & Boolean minimization"),
 (r"completeness|universal|nand|\bnor\b", "Functional completeness & universal gates"),
 (r"sop|pos\b|minterm|canonical|truth table", "Canonical forms (SOP/POS) & minterms"),
 (r"multiplexer|decoder|encoder|rom|combinational|hazard|majority|circuit", "Combinational circuits (MUX, decoder, encoder)"),
 (r"boolean|xor|xnor|gate|self-dual", "Boolean algebra & logic gates")])

S['coa'] = ([
 "Addressing modes & instruction formats", "Datapath, micro-operations & control unit",
 "Cache memory (mapping & organisation)", "Cache performance & multilevel AMAT",
 "Memory interfacing & main memory", "I/O, interrupts & DMA", "Pipelining (speedup & throughput)",
 "Pipeline hazards & forwarding", "CPU performance (CPI, Amdahl's law)",
 "Number representation & IEEE 754", "Secondary storage (disk)"], [
 (r"vipt", "Cache memory (mapping & organisation)"),
 (r"hazard|forwarding|dependenc|branch|renaming", "Pipeline hazards & forwarding"),
 (r"pipelin", "Pipelining (speedup & throughput)"),
 (r"amat|average access|multi-?level|stalls|bandwidth", "Cache performance & multilevel AMAT"),
 (r"cache", "Cache memory (mapping & organisation)"),
 (r"dma|interrupt|i/o|polling", "I/O, interrupts & DMA"),
 (r"disk", "Secondary storage (disk)"),
 (r"dram|memory (chip|interfacing|interleaving|organi|addressing)", "Memory interfacing & main memory"),
 (r"ieee|floating|fixed-point", "Number representation & IEEE 754"),
 (r"cpi|performance|amdahl|speedup", "CPU performance (CPI, Amdahl's law)"),
 (r"datapath|micro", "Datapath, micro-operations & control unit"),
 (r"addressing|instruction|risc|stack|endian|assembly", "Addressing modes & instruction formats")])

S['os'] = ([
 "Processes, threads & system calls", "fork() & process creation", "CPU scheduling",
 "Critical section, locks & race conditions", "Semaphores & synchronization problems",
 "Deadlock & Banker's algorithm", "Contiguous memory allocation", "Paging, page tables & TLB",
 "Virtual memory & demand paging (EMAT)", "Page replacement algorithms",
 "Disk scheduling & disk structure", "File systems & allocation methods"], [
 (r"fork", "fork() & process creation"),
 (r"disk", "Disk scheduling & disk structure"),
 (r"scheduling", "CPU scheduling"),
 (r"deadlock", "Deadlock & Banker's algorithm"),
 (r"semaphore", "Semaphores & synchronization problems"),
 (r"synchroniz|critical|race|concurrency|lock|test-and-set|alternation", "Critical section, locks & race conditions"),
 (r"page replacement|belady", "Page replacement algorithms"),
 (r"demand paging|page fault|effective|emat|virtual memory", "Virtual memory & demand paging (EMAT)"),
 (r"pag|tlb|mmu", "Paging, page tables & TLB"),
 (r"file", "File systems & allocation methods"),
 (r"contiguous|memory allocation", "Contiguous memory allocation"),
 (r"process|thread|context|system call|mode", "Processes, threads & system calls")])

S['algo'] = ([
 "Asymptotic notation & growth", "Time complexity of code & loops", "Recurrences & Master theorem",
 "Searching & selection (lower bounds)", "Sorting algorithms", "Greedy algorithms & design paradigms",
 "Dynamic programming", "Graph traversal (BFS/DFS, topological sort)", "Minimum spanning trees",
 "Shortest paths", "P, NP & NP-completeness"], [
 (r"\bnp\b", "P, NP & NP-completeness"),
 (r"mst|spanning", "Minimum spanning trees"),
 (r"shortest|dijkstra|bellman", "Shortest paths"),
 (r"bfs|dfs|traversal|topolog|strongly|graph repr", "Graph traversal (BFS/DFS, topological sort)"),
 (r"dynamic|lcs|longest|matrix chain|subarray", "Dynamic programming"),
 (r"greedy|huffman|merge pattern|paradigm", "Greedy algorithms & design paradigms"),
 (r"sort", "Sorting algorithms"),
 (r"recurrence|master", "Recurrences & Master theorem"),
 (r"search|select|min.*max|lower bound|median", "Searching & selection (lower bounds)"),
 (r"asymptotic", "Asymptotic notation & growth"),
 (r"loop|complexity|horner|exponentiation|data structure", "Time complexity of code & loops")])

S['toc'] = ([
 "Regular expressions", "Finite automata (DFA/NFA)", "DFA minimization",
 "Regular language identification & pumping lemma", "Closure properties",
 "Context-free grammars & languages", "Pushdown automata & DCFLs",
 "Turing machines, recursive & RE languages", "Decidability, reductions & countability",
 "Language classification (Chomsky hierarchy)"], [
 (r"decidab|rice|reduc|countab", "Decidability, reductions & countability"),
 (r"recursive|turing|\(RE\)", "Turing machines, recursive & RE languages"),
 (r"minimi|minimal|minimum states", "DFA minimization"),
 (r"pumping", "Regular language identification & pumping lemma"),
 (r"closure", "Closure properties"),
 (r"dpda|dcfl|pushdown|ll\(k", "Pushdown automata & DCFLs"),
 (r"chomsky normal", "Context-free grammars & languages"),
 (r"chomsky|classification|expressive|regular / cfl", "Language classification (Chomsky hierarchy)"),
 (r"regular expression|regular grammar|fa to re", "Regular expressions"),
 (r"cfg|cfl|context-free|grammars", "Context-free grammars & languages"),
 (r"dfa|nfa|finite automata|ε", "Finite automata (DFA/NFA)"),
 (r"regular", "Regular language identification & pumping lemma")])

S['cd'] = ([
 "Compiler phases & symbol table", "Lexical analysis", "Grammars: ambiguity, precedence & left recursion",
 "FIRST/FOLLOW & LL(1) parsing", "Bottom-up (LR) parsing", "Syntax-directed translation",
 "Intermediate code (3AC, SSA)", "Basic blocks, CFG & DAG", "Code optimization & data-flow analysis",
 "Register allocation", "Runtime environments & activation records"], [
 (r"parsing & code optimization", "Compiler phases & symbol table"),
 (r"register", "Register allocation"),
 (r"liveness|optimiz|code motion|data-flow|cse", "Code optimization & data-flow analysis"),
 (r"basic block|dag|control flow|\bast\b", "Basic blocks, CFG & DAG"),
 (r"intermediate|three-address|static single|ssa|triples|backpatch", "Intermediate code (3AC, SSA)"),
 (r"sdt|syntax.directed|attributed|type checking", "Syntax-directed translation"),
 (r"runtime|activation", "Runtime environments & activation records"),
 (r"lexical", "Lexical analysis"),
 (r"ll\(1\)|first", "FIRST/FOLLOW & LL(1) parsing"),
 (r"lr|shift-reduce|bottom-up|slr|cyk|parser types", "Bottom-up (LR) parsing"),
 (r"recursion|associativ|precedence|context-free|grammar", "Grammars: ambiguity, precedence & left recursion"),
 (r"phase|symbol|parsing", "Compiler phases & symbol table")])

S['pds'] = ([
 "C: operators, loops & control flow", "C pointers, arrays & strings",
 "C functions, parameter passing & storage classes", "Recursion", "Stacks & queues", "Linked lists",
 "Binary trees & traversals", "Binary search trees & AVL trees", "Binary heaps", "Hashing",
 "Software engineering (old syllabus)"], [
 (r"software|cyclomatic|cocomo|srs|testing|life cycle", "Software engineering (old syllabus)"),
 (r"hash", "Hashing"),
 (r"heap|young tableau|meld", "Binary heaps"),
 (r"avl|bst|binary search tree|balanced", "Binary search trees & AVL trees"),
 (r"tree", "Binary trees & traversals"),
 (r"stack|queue", "Stacks & queues"),
 (r"linked list", "Linked lists"),
 (r"recursion", "Recursion"),
 (r"static|storage|scop|parameter passing|call by|function", "C functions, parameter passing & storage classes"),
 (r"pointer|array|string", "C pointers, arrays & strings"),
 (r".", "C: operators, loops & control flow")])

S['cn'] = ([
 "Layering (OSI/TCP-IP) & devices", "Switching, delays & performance", "Error detection & correction (CRC, Hamming)",
 "Sliding window & flow control", "MAC protocols & Ethernet (CSMA/CD, ALOHA)", "Subnetting, CIDR & IP addressing",
 "IPv4 header & fragmentation", "ARP & NAT", "Routing (DV & LS)", "TCP connection & sequence numbers",
 "TCP congestion control & token bucket", "UDP, transport layer & sockets", "Application layer (DNS, HTTP, SMTP)",
 "Network security (old syllabus)", "Web technologies (old syllabus)"], [
 (r"web tech|html|xml|soa", "Web technologies (old syllabus)"),
 (r"security|rsa|signature|firewall", "Network security (old syllabus)"),
 (r"crc|hamming|error", "Error detection & correction (CRC, Hamming)"),
 (r"arp|address resolution|^nat$", "ARP & NAT"),
 (r"sliding|stop-and|go-back|selective|framing|stuffing", "Sliding window & flow control"),
 (r"fragment|header|ttl", "IPv4 header & fragmentation"),
 (r"aloha|csma|ethernet|token ring|802\.11|slotted|lan switch", "MAC protocols & Ethernet (CSMA/CD, ALOHA)"),
 (r"token bucket|congestion", "TCP congestion control & token bucket"),
 (r"application|dns|http|smtp|web browsing", "Application layer (DNS, HTTP, SMTP)"),
 (r"socket|udp|transport", "UDP, transport layer & sockets"),
 (r"layers|osi|pdu", "Layering (OSI/TCP-IP) & devices"),
 (r"tcp", "TCP connection & sequence numbers"),
 (r"longest prefix|subnet|cidr|ip addressing|classful|ip vs mac", "Subnetting, CIDR & IP addressing"),
 (r"layer|osi|pdu", "Layering (OSI/TCP-IP) & devices"),
 (r"routing|distance vector|link state|ospf|rip|router", "Routing (DV & LS)"),
 (r"delay|store-and|transmission", "Switching, delays & performance")])

S['em'] = ([
 "Matrices, determinants & rank", "Systems of linear equations", "Eigenvalues & eigenvectors",
 "Vector spaces & LU decomposition", "Limits, continuity & series", "Differentiation, maxima/minima & MVT",
 "Integration", "Probability & conditional probability (Bayes)", "Random variables, expectation & statistics",
 "Probability distributions", "Numerical methods (old syllabus)"], [
 (r"bisection|newton|numerical|secant", "Numerical methods (old syllabus)"),
 (r"eigen|diagonaliz", "Eigenvalues & eigenvectors"),
 (r"\blu\b|vector", "Vector spaces & LU decomposition"),
 (r"linear equations|null space", "Systems of linear equations"),
 (r"rolle", "Differentiation, maxima/minima & MVT"),
 (r"determinant|rank|matri|trace|linear algebra", "Matrices, determinants & rank"),
 (r"continuity|limit|series|functions / composition|intermediate value", "Limits, continuity & series"),
 (r"mean value|maxima|minima|monotonic|different|derivative|polynomials", "Differentiation, maxima/minima & MVT"),
 (r"integra", "Integration"),
 (r"binomial|poisson|exponential|uniform|distribution|hypergeometric|geometric", "Probability distributions"),
 (r"expectation|variance|covariance|random variable|density|mean|median|cdf", "Random variables, expectation & statistics"),
 (r"probab|bayes", "Probability & conditional probability (Bayes)")])

S['db'] = ([
 "ER model", "Relational model, keys & integrity constraints", "Relational algebra", "Tuple relational calculus",
 "SQL queries", "Functional dependencies & attribute closure", "Normal forms & decomposition",
 "File organization, indexing & query processing", "B & B+ trees", "Transactions, serializability & recoverability",
 "Concurrency control (2PL, timestamps)", "Recovery & logging", "Software engineering (old syllabus)"], [
 (r"software", "Software engineering (old syllabus)"),
 (r"b\+|b tree", "B & B+ trees"),
 (r"index|file organization|join algorithm|query size", "File organization, indexing & query processing"),
 (r"recovery|undo", "Recovery & logging"),
 (r"2pl|two-phase|concurrency control|timestamp|deadlock", "Concurrency control (2PL, timestamps)"),
 (r"referential|constraint|foreign", "Relational model, keys & integrity constraints"),
 (r"serializ|recoverab|cascad|transaction|acid", "Transactions, serializability & recoverability"),
 (r"minimal cover|normal form|lossless|decomposition", "Normal forms & decomposition"),
 (r"functional dep", "Functional dependencies & attribute closure"),
 (r"key", "Relational model, keys & integrity constraints"),
 (r"closure", "Functional dependencies & attribute closure"),
 (r"er model", "ER model"),
 (r"tuple", "Tuple relational calculus"),
 (r"sql", "SQL queries"),
 (r"relational algebra|join", "Relational algebra"),
 (r"relational model", "Relational model, keys & integrity constraints")])

S['ga'] = ([
 "Grammar & sentence correction", "Vocabulary & word usage", "Reading comprehension & verbal reasoning",
 "Numerical ability / arithmetic", "Algebra, functions & sequences", "Geometry & mensuration",
 "Data interpretation", "Analytical & logical reasoning", "Spatial reasoning", "Probability & counting puzzles"], [
 (r"data interp|data inference|data suff|venn|statistics|mean & standard", "Data interpretation"),
 (r"probab|bayes|permutation|combination|counting", "Probability & counting puzzles"),
 (r"spatial|paper|cube folding|symmetry|visual|jigsaw", "Spatial reasoning"),
 (r"verbal analogy|odd one out \(words|logical inference \(verbal", "Vocabulary & word usage"),
 (r"logical|syllogism|arrangement|seating|blood|direction|coding|letter series|number series|ordering|puzzle|clock|shortest route|graph connectivity|analogy", "Analytical & logical reasoning"),
 (r"geometry|mensuration|area|coordinate", "Geometry & mensuration"),
 (r"reading|passage|critical reasoning|verbal reasoning|course of action|sentence meaning|sentence ordering", "Reading comprehension & verbal reasoning"),
 (r"grammar|article|preposition|sentence correction|relative pronoun|word order", "Grammar & sentence correction"),
 (r"vocab|synonym|antonym|idiom|word|sentence completion", "Vocabulary & word usage"),
 (r"algebra|quadratic|polynomial|logarithm|exponent|root|radical|linear|function|sequence|series|progression|minimization|maxima", "Algebra, functions & sequences"),
 (r".", "Numerical ability / arithmetic")])
OVERRIDE = {
 ('dm', 'Combinatorics (lattice paths)'): "Counting & combinatorics",
 ('dm', 'Euler circuits'): "Graph theory (degree, connectivity, trees)",
 ('dm', 'Summations'): "Counting & combinatorics",
 ('dl', "Two's complement overflow"): "2's complement & signed number representation",
 ('algo', 'BFS / shortest path'): "Graph traversal (BFS/DFS, topological sort)",
 ('toc', 'Ambiguity / derivation trees'): "Context-free grammars & languages",
 ('coa', 'Memory references / program execution'): "Addressing modes & instruction formats",
 ('pds', 'B-trees'): "Binary search trees & AVL trees",
 ('pds', 'C memory layout (stack/heap)'): "C pointers, arrays & strings",
 ('os', 'I/O (synchronous vs asynchronous)'): "Processes, threads & system calls",
 ('os', 'Free space management (linked list)'): "File systems & allocation methods",
 ('cd', 'Live variable analysis'): "Code optimization & data-flow analysis",
 ('cn', 'TCP connection management / sockets'): "TCP connection & sequence numbers",
 ('cn', 'Manchester encoding'): "Switching, delays & performance",
 ('cn', 'Throughput / bottleneck link'): "Switching, delays & performance",
 ('db', 'Relational calculus'): "Tuple relational calculus",
 ('db', 'Normalization (dependency preservation)'): "Normal forms & decomposition",
 ('db', 'Schema levels (three-schema architecture)'): "Relational model, keys & integrity constraints",
 ('db', "Armstrong's axioms"): "Functional dependencies & attribute closure",
 ('ga', 'Analytical reasoning'): "Analytical & logical reasoning",
 ('ga', 'Pattern completion (dot grids)'): "Spatial reasoning",
 ('ga', 'Graph reasoning (Hamiltonian cycle)'): "Analytical & logical reasoning",
('ga', 'Sentence ordering'): "Reading comprehension & verbal reasoning",
('ga', 'Logical inference (verbal)'): "Reading comprehension & verbal reasoning"}

import os
PREV = json.load(open(BASE + r"\topic_map.json", encoding="utf-8"))["map"] if os.path.exists(BASE + r"\topic_map.json") else {}
NEW = []
out = {"taxonomy": {}, "map": {}}
bad = []
for s, topics in raw.items():
    tax, rules = S[s]
    assert len(set(tax)) == len(tax)
    out["taxonomy"][s] = tax
    m = {}
    for k in topics:
        c = PREV.get(s, {}).get(k) or OVERRIDE.get((s, k))
        if k not in PREV.get(s, {}): NEW.append((s, k))
        if c is None:
            for rx, canon in rules:
                if re.search(rx, k, re.I):
                    c = canon; break
        if c is None: bad.append((s, k))
        m[k] = c
    out["map"][s] = m
if len(sys.argv) > 1 and sys.argv[1] == "new":
    for s, k in NEW: print(f"{s:5} {str(out['map'][s][k]):<50} <- {k}")
    sys.exit(0)
if bad:
    print("UNMAPPED", bad); sys.exit(1)
with open(BASE + r"\topic_map.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
if len(sys.argv) > 1:
    for s in raw:
        print("##", s)
        for k, v in sorted(out["map"][s].items(), key=lambda x: x[1]): print(f"  {v:<50} <- {k}")
