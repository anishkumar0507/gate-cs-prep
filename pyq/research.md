# GATE CS (Computer Science & IT) — Research Summary

Compiled 2026-09-30. Every page cited below was opened (official PDFs were downloaded and read). **[U]** marks something uncertain or unverified.

---

## 1. GATE 2027: status as of 30 Sep 2026

| Item | Detail | Source |
|---|---|---|
| Organising institute | **IIT Madras** | IB §2; IITM press release (20 Jul 2026) |
| Official site | https://gate2027.iitm.ac.in | IB |
| Information Brochure | **Released.** https://gate2027ib.iitm.ac.in/GATE2027-IB.pdf ("Revised version, Date: 27th September 2026") | IB p.1 |
| Registration (GOAPS) | Opened 2 Sep 2026 (after two postponements from 14 Aug and 27 Aug). Regular close **5 Oct 2026**; late-fee close **12 Oct 2026** | Important Dates page, IB §3 |
| Application correction | 14–21 Oct 2026 | Important Dates page |
| Exam-city notification | 4 Jan 2027 | Important Dates page |
| Admit card | TBA | Important Dates page |
| Exam dates | **6, 7, 13, 14, 20, 21 Feb 2027**, forenoon 9:30–12:30 and afternoon 14:30–17:30. The paper-wise schedule (which day CS is on) is **not yet published** | IB §3 |
| Results | 19 Mar 2027 | IB §3 |
| Score validity | 3 years | IB §2 |

**Changes vs GATE 2026**
- **Syllabus revised** for all papers, "after 5 years" (IITM press release). The CS changes are listed below. I compared the two official PDFs myself.
- New paper: **Robotics & Automation (RA)**. TF became a section of XE (XE9). XE, XH and XL section codes were renumbered. There are still 30 papers.
- DigiLocker registration and live facial capture during registration.
- The **CS exam pattern is unchanged**: 65 questions, 100 marks, GA 15, Engineering Mathematics 13, core 72. See §2.

**CS syllabus diff, 2026 (IITG PDF) vs 2027 (IITM PDF)**
| Section | 2026 wording | 2027 wording | Practical effect |
|---|---|---|---|
| Engg Maths | — | identical | none |
| Digital Logic | "Boolean algebra. Combinational and sequential circuits. Minimization. Number representations and computer arithmetic" | "Boolean algebra and minimization – algebraic technique, **Karnaugh map, tabular method**. **Design of** combinational and sequential circuits. Number representation and arithmetic (fixed and floating point)" | Quine–McCluskey (tabular) method and circuit *design* are now explicit |
| COA | "Machine instructions and addressing modes. ALU, data-path and control unit. Instruction pipelining, pipeline hazards. Memory hierarchy: cache, main memory and secondary storage; I/O interface (interrupt and DMA mode)" | "Instruction set and addressing modes. **Design of ALU. Design of control unit – hardwired and microprogrammed. Memory interfacing** and hierarchy: performance, cache memory mapping. I/O interface (interrupt and DMA). Instruction pipelining, pipeline hazards" | Hardwired vs microprogrammed control and memory interfacing are now explicit. "Secondary storage" and "data-path" are no longer named |
| PDS, Algorithms, TOC, CD, OS, DBMS | — | identical | none |
| Computer Networks | Named OSI/TCP-IP stacks, framing, Ethernet bridging, flooding/shortest-path routing, ARP/DHCP/ICMP, UDP, SMTP, FTP, Email | "Principles of Layering; switching (circuit, packet, virtual circuit) and **performance metrics**; DLL: error detection, MAC, Ethernet; DV and LS routing; IPv4 – Fragmentation, CIDR, NAT; TCP – flow & congestion control, **socket API**; DNS and HTTP" | **Narrower.** ARP, DHCP, ICMP, UDP, SMTP, FTP, email, framing, bridging and flooding are no longer named. Performance metrics and the socket API are added |

Sources: https://gate2027.iitm.ac.in/static/doc/GATE2027_Syllabus/CS_GATE2027_Syllabus.pdf · https://gate2026.iitg.ac.in/doc/GATE2026_Syllabus/CS_2026_Syllabus.pdf · https://www.iitm.ac.in/happenings/press-releases-and-coverages/iit-madras-announces-dates-syllabus-revision-new-paper · https://gate2027.iitm.ac.in/important_dates

---

## 2. Current exam pattern (CS), per the GATE 2027 IB and question-pattern page

| Particular | Rule |
|---|---|
| Mode / language | CBT, English only |
| Duration | 3 hours (PwD: 20 min/hour compensatory) |
| Questions / marks | **65 questions, 100 marks** = GA 10 Q (15 marks) + subject 55 Q (85 marks) |
| CS marks split | **GA 15 + Engineering Mathematics 13 + core CS 72**. In CS, "Engineering Mathematics" is syllabus Section 1, so it **includes Discrete Maths** |
| GA split | 5 × 1-mark + 5 × 2-mark (official) |
| Subject split | 25 × 1-mark + 30 × 2-mark. This is inferred from 85 marks in 55 questions and confirmed by the 2026 CS1 and CS2 keys: Q11–35 are 1-mark and Q36–65 are 2-mark |
| Paper total | 30 one-mark + 35 two-mark questions |
| MCQ | 1 correct out of 4. Wrong answer: **−1/3** (1-mark) or **−2/3** (2-mark) |
| MSQ | One or more of 4 options correct. **No negative marking and no partial marking**: you must select exactly the correct set |
| NAT | Answer typed on a virtual keypad. **No negative marking.** Keys give a range, e.g. "4.24 to 4.26" |
| Calculator | **Only the on-screen virtual calculator.** No physical calculator is allowed |

**Question-type mix in GATE 2026 (counted from the official keys)**
| Paper | MCQ (1m/2m) | MSQ (1m/2m) | NAT (1m/2m) |
|---|---|---|---|
| CS1 (8 Feb 2026, FN) | GA 10 + 8/10 | 13/11 (24 MSQs) | 4/9 |
| CS2 (8 Feb 2026, AN) | GA 10 + 14/11 | 4/5 | 6/13 |

So the two sessions had very different MSQ loads. Only MCQs carry negative marks, so in CS1 at most 18 subject questions could lose marks.

GATE 2026 CS qualifying cut-off: General 30, OBC-NCL/EWS 27, SC/ST/PwD 20. CS AIR-1 scored 92.57 (score 1000). Sources: https://gate2026.iitg.ac.in/cut-off.html and https://gate2026.iitg.ac.in/all-india-rank.html

Sources: https://gate2027.iitm.ac.in/question_paper_pattern · IB §4 and §7.3 · https://gate2026.iitg.ac.in/question-paper-pattern.html (the 2026 pattern is identical)

---

## 3. Official GATE 2027 CS syllabus (verbatim, IITM PDF)

**GA (common to all papers):** Verbal (grammar, vocabulary, reading comprehension, narrative sequencing); Quantitative (data interpretation, numerical computation and estimation, mensuration, geometry, elementary statistics and probability); Analytical (deduction/induction, analogy, numerical relations); Spatial (transformation of shapes, paper folding and cutting, 2D/3D patterns). PDF: https://gate2027.iitm.ac.in/static/doc/GATE2027_Syllabus/GA_GATE2027_Syllabus.pdf

1. **Engineering Mathematics**
   - *Discrete Mathematics:* propositional and first-order logic; sets, relations, functions, partial orders and lattices; monoids, groups; graphs (connectivity, matching, colouring); combinatorics (counting, recurrence relations, generating functions).
   - *Linear Algebra:* matrices, determinants, systems of linear equations, eigenvalues and eigenvectors, LU decomposition.
   - *Calculus:* limits, continuity and differentiability, maxima and minima, mean value theorem, integration.
   - *Probability and Statistics:* random variables; uniform, normal, exponential, Poisson and binomial distributions; mean, median, mode, standard deviation; conditional probability and Bayes' theorem.
2. **Digital Logic:** Boolean algebra and minimization (algebraic technique, K-map, tabular method); design of combinational and sequential circuits; number representation and arithmetic (fixed and floating point).
3. **COA:** instruction set and addressing modes; ALU design; control unit design (hardwired and microprogrammed); memory interfacing and hierarchy (performance, cache memory mapping); I/O interface (interrupt and DMA); instruction pipelining and pipeline hazards.
4. **Programming and Data Structures:** programming in C; recursion; arrays, stacks, queues, linked lists, trees, BSTs, binary heaps, graphs.
5. **Algorithms:** searching, sorting, hashing; asymptotic worst-case time and space complexity; greedy, DP, divide-and-conquer; graph traversals, MST, shortest paths.
6. **Theory of Computation:** regular expressions and FA; CFGs and PDA; regular and context-free languages, pumping lemma; Turing machines and undecidability.
7. **Compiler Design:** lexical analysis, parsing, syntax-directed translation; runtime environments; intermediate code generation; local optimisation; data-flow analyses (constant propagation, liveness analysis, common subexpression elimination).
8. **Operating System:** system calls, processes, threads, IPC, concurrency and synchronization; deadlock; CPU and I/O scheduling; memory management and virtual memory; file systems.
9. **Databases:** ER model; relational model (relational algebra, tuple calculus, SQL); integrity constraints, normal forms; file organization, indexing (B and B+ trees); transactions and concurrency control.
10. **Computer Networks:** principles of layering; switching (circuit, packet, virtual circuit) and performance metrics; data link layer (error detection, MAC, Ethernet); distance-vector and link-state routing; IPv4 (fragmentation, CIDR, NAT); TCP (flow control, congestion control, socket API); DNS and HTTP.

---

## 4. Subject-wise marks weightage in GATE CS

**Primary source:** the GATE Overflow subject-wise mark distribution spreadsheet, per paper set. Its question-level tagging covers 2010 to 2025-2. It is linked from https://gatecse.in/mark-distribution-in-gate-cse/ (short URL md.gatecse.in). Sheet: https://docs.google.com/spreadsheets/d/1ELvXc5h1iMOv31KZ4m6UQQZq3J8g-nVhZNlTP9Vpiuc. I downloaded it and summed its sub-columns: PDS = Programming + Data Structures, and GA = the 4 aptitude parts. The live chart page https://gateoverflow.in/marks-distribution lists 2026-1/2026-2 but was Cloudflare-blocked for me.

**2026 rows:** I classified all 110 questions of the official CS1 and CS2 papers myself. **[U]** Borderline tags:
- ambiguity of grammars counted as CD, not TOC
- CS1 Q24 hashing counted as PDS
- CS1 Q47 vertex cover counted as DM
- CS1 Q54 cache+TLB counted as COA
- CS1 Q59 disk counted as OS
- CS2 Q17 C heap counted as PDS

Expect ±2 marks per subject against other analyses. GATE officially fixes EM (incl. DM) at 13, but my CS1 tags sum to EM+DM = 15, so two of those marks are probably "core" in GATE's own accounting.

Marks out of 100:

| Set | Engg Maths | Discrete | Digital | COA | P&DS | Algo | TOC | CD | OS | DBMS | CN | GA |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-1 **[U, own]** | 8 | 7 | 8 | 9 | 12 | 7 | 5 | 7 | 8 | 6 | 8 | 15 |
| 2026-2 **[U, own]** | 9 | 4 | 7 | 9 | 12 | 9 | 5 | 6 | 9 | 6 | 9 | 15 |
| 2025-1 | 7 | 6 | 6 | 8 | 10 | 8 | 10 | 6 | 8 | 8 | 8 | 15 |
| 2025-2 | 9 | 3 | 9 | 9 | 12 | 8 | 7 | 6 | 7 | 9 | 6 | 15 |
| 2024-1 | 8 | 6 | 6 | 8 | 6 | 9 | 5 | 10 | 10 | 8 | 9 | 15 |
| 2024-2 | 6 | 9 | 6 | 8 | 8 | 6 | 7 | 8 | 10 | 8 | 9 | 15 |
| 2023 | 6 | 10 | 6 | 10 | 9 | 6 | 9 | 7 | 9 | 5 | 8 | 15 |
| 2022 | 6 | 13 | 5 | 7 | 9 | 6 | 8 | 4 | 10 | 7 | 10 | 15 |
| 2021-1 | 8 | 9 | 6 | 5 | 10 | 9 | 8 | 7 | 6 | 8 | 9 | 15 |
| 2021-2 | 9 | 6 | 7 | 6 | 8 | 10 | 11 | 6 | 8 | 7 | 7 | 15 |
| 2020 | 5 | 8 | 6 | 9 | 10 | 8 | 9 | 4 | 10 | 8 | 6 | 15 |
| 2019 | 8 | 8 | 8 | 4 | 12 | 6 | 8 | 6 | 10 | 8 | 9 | 15 |
| 2018 | 7 | 11 | 6 | 8 | 10 | 8 | 8 | 5 | 9 | 6 | 7 | 15 |
| 2017-1 | 8 | 6 | 3 | 10 | 12 | 6 | 12 | 6 | 6 | 8 | 8 | 15 |
| 2017-2 | 10 | 6 | 10 | 6 | 13 | 8 | 9 | 4 | 6 | 8 | 5 | 15 |
| 2016-1 | 5 | 8 | 7 | 5 | 13 | 7 | 9 | 7 | 9 | 5 | 10 | 15 |
| 2016-2 | 4 | 9 | 3 | 11 | 12 | 9 | 9 | 5 | 7 | 6 | 9 | 15 |
| 2015-1* | 8 | 13 | 3 | 2 | 12 | 10 | 5 | 6 | 10 | 6 | 6 | 15 |
| 2015-2* | 3 | 19 | 5 | 5 | 7 | 9 | 7 | 4 | 8 | 6 | 8 | 15 |
| 2015-3* | 8 | 6 | 6 | 5 | 12 | 15 | 3 | 3 | 6 | 6 | 8 | 15 |
| 2014-1* | 10 | 12 | 4 | 7 | 4 | 4 | 6 | 3 | 8 | — [U: blank in sheet] | 8 | 15 |
| 2014-2* | 7 | 8 | 7 | 5 | 6 | 11 | 6 | 6 | 9 | 8 | 7 | 15 |
| 2014-3* | 9 | 14 | 6 | 5 | 4 | 12 | 5 | 5 | 7 | 8 | 9 | 15 |

\* For 2014–2015, rows sum to less than 100 because of subjects since removed from the syllabus: IS & Software Engineering and Web Technologies, 1–5 marks per set. A few rows (2016-2, 2019, 2020) are off by ±1–2 because of tagging in the sheet.

**Typical range per subject.** Covers the 10 sets from 2021 to 2026, the current-syllabus era (min–max, with the mean in brackets).

| Subject | Range (avg) | Comment |
|---|---|---|
| General Aptitude | 15 (fixed) | Easiest 15 marks |
| Engg Maths (LA + Calc + Prob) | 6–9 (7.6) | Probability and LA dominate. Calculus is 1–3 marks |
| Discrete Maths | 3–13 (7.3) | Highly variable. EM+DM together ≈ 13–15 (officially 13) |
| Digital Logic | 5–9 (6.6) | |
| COA | 5–10 (7.9) | Trending up in 2025–26 (8–9) |
| Programming & DS | 6–12 (9.6) | Highest core subject. 12 in both 2026 sets |
| Algorithms | 6–10 (7.8) | |
| TOC | 5–11 (7.5) | |
| Compiler Design | 4–10 (6.7) | |
| Operating Systems | 6–10 (8.5) | Consistently high |
| DBMS | 5–9 (7.2) | |
| Computer Networks | 6–10 (8.3) | |

**Cross-check with other published sources.** Their numbers differ slightly because each tags questions differently.
- **GeeksforGeeks** (2018–2023, one set per year): https://www.geeksforgeeks.org/gate/subject-wise-weightage-for-gate-cs/
  - e.g. 2023: PDS 11, Algo 6, OS 7, DBMS 5, CN 8, COA 12, DM 6, TOC 9, CD 5, DL 6, EM 4, GA 14. This broadly agrees with GO.
  - Some years differ from GO by a few marks: 2018 Algo 10 vs GO 8; 2020 PDS 12 vs GO 10; 2023 COA 12 vs GO 10.
- **GO Classes blog** (2023–2025, 3-year averages): https://www.goclasses.in/blog/a-strategic-analysis-of-subject-wise-weightage-trends-in-gate-cse-2023-2025
  - PDS 9.7, COA 9.7, OS 8.3, TOC 8.3, CN 8.3, Algo 7.3, DBMS 7.0, CD 6.0, DL 5.7.
  - It also notes that MSQs rose from 15 to 20 in 2024.
- **Careers360** (question counts, not marks, 2021–2026): https://engineering.careers360.com/articles/gate-cse-subject-wise-weightage
  - 2026 per shift: Algo 8/8, COA 8/8, EM 8/8, PDS 7/7, CN 5/5, OS 5/4, DB 4/4, TOC 4/4, CD 4/3, DL 2/4 questions.
- **MADE EASY** 2026 analysis (approximate, not split by set): https://www.madeeasy.in/blog/gate-computer-science-paper
  - EM 13, PDS 11–12, OS 8–9, Algo 7–8, CN 7–8, COA 7–8, DBMS 6–7, TOC 6, DL 4–5, CD 4.
  - Their verdict: "moderate to difficult, slightly tougher than 2025"; shift 1 was lengthy and calculation-heavy.
- **BYJU'S** (2017–2020, %): https://byjus.com/gate/subject-wise-weightage-for-computer-science/
- **Testbook** (2014–2019, %): https://testbook.com/gate-cs/subject-wise-weightage. **[U]** Its 2014–2016 Engg-Maths figures (23/19/13%) do not match GO's per-set data.
- **Avoid:** PW's page (https://www.pw.live/gate/exams/gate-cse-subject-wise-weightage). Its "2026" table is identical to its 2020 table, so it is copied.

---

## 5. Topic-level patterns and traps (per subject)

These are compiled from recurring PYQ themes. The "2026:" items were verified in the official CS1 and CS2 papers. **[U]** The frequency ordering is a qualitative judgement, not a count.

**Engineering Maths**
- Most asked:
  - Conditional probability and Bayes
  - Expectation and variance of discrete RVs (2026 CS1 Q58)
  - Standard distributions (2026 CS2 Q14: identify a normal pdf)
  - Eigenvalues: trace/determinant, multiplicity (2026 CS1 Q13)
  - Rank, null space, consistency of linear systems (CS1 Q20; CS2 Q31)
  - Determinant scaling, det(kA) = kⁿ·det A (CS2 Q62)
  - Limits, continuity, differentiability of piecewise and |x| functions (CS1 Q32, Q46)
  - Definite integrals
- Traps: det(2A) for a 4×4 matrix is 16·det A, not 2·det A; "independent" vs "mutually exclusive"; checking continuity AND differentiability at the kink.

**Discrete Maths**
- Most asked:
  - Predicate logic translation (2026 CS2 Q11)
  - Properties of relations: reflexive, symmetric, antisymmetric, transitive (CS2 Q26)
  - Equivalence relations and partial orders/lattices
  - Groups
  - Counting and pigeonhole, e.g. parity-constrained 0/1 matrices (CS1 Q12)
  - Recurrences and generating functions
  - Graph theory: matchings (CS1 Q57), colouring/bipartite (CS1 Q55), spanning trees of Kₙ (CS2 Q36), vertex cover
- Traps: scope of quantifiers; "antisymmetric" is not the same as "not symmetric"; the empty relation's properties; off-by-one in counting.

**Digital Logic**
- Most asked:
  - K-map minimal SOP with multiple minimal answers, an MSQ favourite (CS1 Q48; CS2 Q40)
  - Boolean identities (CS2 Q16)
  - Overflow in 2's-complement or sign-magnitude (CS1 Q22; CS2 Q28)
  - IEEE-754 decode/add (CS1 Q36; CS2 Q34)
  - Counters and sequential circuit design (CS1 Q37)
  - Mux/decoder circuits (CS2 Q59)
- Traps: overflow rules differ by representation; IEEE bias 127 and the hidden 1; a K-map with several minimal covers (MSQ asks for all of them).

**COA**
- Most asked:
  - **Cache**: tag/index/offset bits, direct-mapped vs k-way, hit/miss sequences, block number mapping (CS1 Q38; CS2 Q52, Q56)
  - **Pipelining**: CPI, speedup, stalls, hazards RAW/WAR/WAW (CS1 Q16, Q60; CS2 Q57)
  - Instruction formats and expanding opcodes (CS2 Q44)
  - Addressing modes (CS1 Q14)
  - Interrupts (vectored vs non-vectored) and DMA (CS2 Q18)
  - Memory interfacing and control units (newly explicit in 2027)
- Traps: byte- vs word-addressable memory; RAR is not a hazard; whether the pipeline speedup counts buffer/latch delay; physically vs virtually addressed cache.

**Programming & Data Structures**
- Most asked:
  - C output tracing: pointers, scope/shadowing, recursion, static variables (CS1 Q34, Q61; CS2 Q60, Q61)
  - C declaration errors: lexical vs syntax vs semantic (CS1 Q27; CS2 Q19)
  - BST traversals (preorder → postorder) and BST insertion order (CS1 Q40, Q62)
  - Heap array indices and leaves (CS1 Q23)
  - Hashing with linear probing or chaining (CS1 Q24; CS2 Q30)
  - Stacks and queues (CS2 Q50)
  - Linked-list code fill-in (CS1 Q39)
  - Tree height and node counts (CS1 Q33)
- Traps: a shadowed variable inside a block; integer division; which memory region (heap vs stack vs static); height defined in edges vs nodes.

**Algorithms**
- Most asked:
  - Recurrences and the Master theorem (CS1 Q17; CS2 Q25)
  - Asymptotic ordering, e.g. log n! = Θ(n log n) (CS2 Q24)
  - MST properties (cut and cycle) (CS1 Q49)
  - Shortest paths: Dijkstra/Bellman-Ford, DAG in O(V+E) (CS1 Q41; CS2 Q37)
  - DFS discovery/finish times and edge types (CS1 Q50)
  - DP table recurrences (CS2 Q39)
  - Merge-sort and sorting comparisons (CS2 Q32)
- Traps: Master theorem gap cases; Dijkstra with negative edges; "worst case of the fastest algorithm".

**TOC**
- Most asked:
  - DFA minimization and NFA→DFA state bounds, at most 2ⁿ (CS1 Q26)
  - Language equality or subset between two FAs (CS2 Q47)
  - Closure properties, "always true" MSQs (CS1 Q51)
  - Identifying the class of aⁱbʲcᵏ-type languages (CS2 Q48)
  - Counting properties of CFG-generated strings (CS1 Q52)
  - Decidability; "decides" vs "recognizes" (CS2 Q13)
- Traps: "L1 ⊆ L2 and L2 regular" does NOT make L1 regular; a minimal DFA can have 1 state; the difference between halting on all inputs and accepting all inputs.

**Compiler Design**
- Most asked:
  - LL(1) facts: left-factoring, no left recursion, no backtracking (CS1 Q28)
  - LR(0)/SLR conflicts (CS2 Q41)
  - Ambiguity (CS1 Q25; CS2 Q29)
  - Counting tokens (CS2 Q35)
  - SDD/SDT, S-attributed vs L-attributed (CS1 Q53)
  - Liveness and common subexpressions on a CFG (CS1 Q42; CS2 Q45)
  - Runtime environment and activation records
- Traps: counting shift-reduce conflicts across all states; the longest-match rule in lexing; an unterminated string is a *lexical* error.

**Operating Systems**
- Most asked:
  - CPU scheduling: SRTF/RR/priority completion and waiting times, preemptive vs not (CS1 Q64; CS2 Q23)
  - Semaphore/synchronization tracing (CS2 Q51)
  - Deadlock: Banker's algorithm, minimum resources for deadlock freedom (CS1 Q29, Q35)
  - fork() counting (CS1 Q63)
  - Paging, TLB reach and EMAT (CS2 Q54)
  - Page replacement: FIFO/LRU/Optimal, Belady
  - Contiguous allocation: first/best/worst fit (CS2 Q55)
  - File-system free-space management and disk timing (CS1 Q59; CS2 Q53)
- Traps: Banker's algorithm is *avoidance*, not prevention; fork() inside loops with `continue`/`break`; tie-breaking rules in scheduling.

**DBMS**
- Most asked:
  - FD closure, Armstrong's axioms, candidate keys, superkey counting (CS1 Q30, Q65; CS2 Q42)
  - Normal forms and decomposition: 3NF is always lossless + dependency-preserving; BCNF is not always dependency-preserving (CS1 Q31)
  - RA ↔ TRC ↔ SQL equivalence (CS1 Q43)
  - Transactions: conflicts, conflict/view serializability, 2PL, recoverability (CS2 Q20)
  - Indexing: dense vs sparse, B/B+ tree order and fan-out (CS2 Q46)
  - Schema levels (CS2 Q15)
- Traps: SQL NULL semantics and duplicate handling; superkey counting with overlapping keys (inclusion–exclusion).

**Computer Networks**
- Most asked:
  - Subnetting and CIDR block assignment and alignment (CS1 Q56; CS2 Q33)
  - TCP congestion: slow start, ssthresh, cwnd growth per RTT (CS1 Q44; CS2 Q58)
  - Sliding-window efficiency and sequence-number bits (CS1 Q45; CS2 Q65)
  - Store-and-forward delay over multiple links (CS2 Q21)
  - CRC remainder (CS2 Q43)
  - TCP handshake and teardown facts (CS1 Q18)
  - HTTP persistent connections (CS1 Q19)
- Traps: k = 10³ vs 2¹⁰; the bottleneck link; usable hosts (−2) vs total addresses; CIDR blocks must align to their size; cwnd capped by the receiver window.

**General Aptitude**
- Most asked: logical implication and "not necessarily true" (CS1 Q5); counting (CS1 Q3: knock-out tournament gives n−1 games); vocabulary and antonyms; paper-folding and tiling spatial items (CS1 Q2); data interpretation.

---

## 6. Widely agreed preparation strategy (brief)

- **Syllabus plus PYQs first.** Solve all GATE CS PYQs (GATE Overflow is the standard archive) before and during theory. PYQs show both framing and depth.
- **One standard book and one problem source per subject.** Revise from **short notes and formula sheets**, not full textbooks.
- **Topic tests right after each subject.** Move to **full-length mocks** once about 70–80% of the syllabus is done. In the last 2 months, take mocks at the real exam time slot.
- **Keep a mistake log**: conceptual gaps vs calculation errors vs time pressure. Re-attempt the questions you got wrong.
- **Protect the "sure" marks.** GA (15) and Engineering/Discrete Maths (about 13) together make roughly 28 predictable marks. Among core subjects, OS, PDS and CN (each 8–12) are the most consistent.
- **Exam tactics**:
  - Negative marking applies only to MCQs, so never leave an MSQ or NAT blank if you have a reasoned guess.
  - MSQs have no partial credit, so check every option.
  - Practise with the **virtual calculator** (the official mock tests use it).
  - Skip long questions and return to them later.
- **Consistency beats long hours**: fixed weekly targets and focused 2–3 hour blocks.

Sources: https://www.madeeasy.in/blog/toppers-preparation-strategy-to-crack-gate · https://www.geeksforgeeks.org/gate/gate-exam-topper-2025/ · https://www.goclasses.in/blog/a-strategic-analysis-of-subject-wise-weightage-trends-in-gate-cse-2023-2025

---

## 7. GATE 2026 CS papers and answer keys: publicly downloadable (verified HTTP 200, application/pdf)

GATE 2026 was organised by IIT Guwahati. CS1 was held on 8 Feb 2026 FN and CS2 on 8 Feb 2026 AN (https://gate2026.iitg.ac.in/examination-schedule.html). The listing page is https://gate2026.iitg.ac.in/QPs-answer-keys.html ("Master Question Papers and Answer Keys"). The keys give question type, section, key or NAT range, and marks.

| File | IIT Guwahati URL | Mirror on the GATE 2027 site (IITM Downloads page) |
|---|---|---|
| CS1 question paper | https://gate2026.iitg.ac.in/doc/download/2026/QPs/CS1.pdf | https://gate2027.iitm.ac.in/static/doc/download/2026/QPs/CS1.pdf |
| CS2 question paper | https://gate2026.iitg.ac.in/doc/download/2026/QPs/CS2.pdf | https://gate2027.iitm.ac.in/static/doc/download/2026/QPs/CS2.pdf |
| CS1 answer key | https://gate2026.iitg.ac.in/doc/download/2026/Keys/CS1_Keys.pdf | https://gate2027.iitm.ac.in/static/doc/download/2026/Keys/CS1_Keys.pdf |
| CS2 answer key | https://gate2026.iitg.ac.in/doc/download/2026/Keys/CS2_Keys.pdf | https://gate2027.iitm.ac.in/static/doc/download/2026/Keys/CS2_Keys.pdf |

The IITM Downloads page (https://gate2027.iitm.ac.in/download) also hosts earlier CS papers and keys:
- 2025: `static/doc/download/2025/CS12025.pdf`, `CS22025.pdf`; keys in `2025_Key/CS1_Keys.pdf`, `CS2_Keys.pdf`
- 2024: `2024/CS124S5.pdf`, `CS224S6.pdf`, `CS1FinalAnswerKey.pdf`, `CS2FinalAnswerKey.pdf`
- 2023: `2023/cs_2023.pdf`; key `Answer_keys2023/CS_ANS_GATE2023.pdf`
- 2022: `2022/cs_2022.pdf`; key `Answer_keys2022/cs_2022.pdf`
- 2021: `2021/cs_2021.pdf`; key `Answer_keys2021/cs_merged_2021.pdf`

All of these are under https://gate2027.iitm.ac.in/.
