const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../../data/zenora_lms.json');

function generateComprehensiveAssessments() {
  console.log('[Assessments Seed] Generating comprehensive assessments across CS, EC, and ME (S1-S6)...');
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

  // Ensure arrays exist
  if (!data.quizzes) data.quizzes = [];
  if (!data.quiz_questions) data.quiz_questions = [];
  if (!data.quiz_options) data.quiz_options = [];
  if (!data.quiz_attempts) data.quiz_attempts = [];

  // Assessment specifications across all cohorts
  const assessmentSpecs = [
    // ----------------------------------------------------
    // COMPUTER SCIENCE (CS)
    // ----------------------------------------------------
    {
      id: 'quiz-cs-s1-01',
      title: 'Problem Solving with C & Computational Logic',
      description: 'Foundational assessment covering C syntax, pointers, memory allocation, conditionals, and iteration structures.',
      dept: 'CS',
      dept_id: 'dept-cs',
      sem: 1,
      batch_id: 'batch-cs-s1',
      subject_id: 'sub-cs101',
      subject_code: 'CS101',
      time_limit: 20,
      total_marks: 50,
      pass_percentage: 60,
      status: 'published',
      available_from: '2026-09-01T09:00:00Z',
      available_until: '2026-12-30T23:59:59Z',
      questions: [
        {
          q: 'Which operator in C returns the memory address of a variable?',
          options: ['& (Address-of operator)', '* (Dereference operator)', '-> (Arrow operator)', '% (Modulus operator)'],
          correct: 0,
          exp: 'The ampersand (&) operator yields the memory address of its operand.'
        },
        {
          q: 'What is the default return type of the main() function in modern ISO C standard?',
          options: ['int', 'void', 'float', 'char*'],
          correct: 0,
          exp: 'According to C99 and subsequent standards, main() must return an integer.'
        },
        {
          q: 'Which dynamic memory allocation function in C initializes allocated memory bytes to zero?',
          options: ['calloc()', 'malloc()', 'realloc()', 'free()'],
          correct: 0,
          exp: 'calloc() allocates contiguous memory and initializes all allocated bits to zero.'
        },
        {
          q: 'What will sizeof(char) always evaluate to in any standard-compliant C compiler?',
          options: ['1', '2', '4', 'Implementation defined'],
          correct: 0,
          exp: 'By definition in the C specification, sizeof(char) is guaranteed to equal 1 byte.'
        },
        {
          q: 'Which keyword is used to prevent modification of a variable value after its initialization?',
          options: ['const', 'static', 'volatile', 'register'],
          correct: 0,
          exp: 'The const qualifier declares that a variable’s value is read-only after initialization.'
        },
        {
          q: 'In C, what is the index of the first element in any array?',
          options: ['0', '1', '-1', 'Undefined'],
          correct: 0,
          exp: 'C uses zero-based array indexing.'
        },
        {
          q: 'What does the break statement do inside a switch-case block?',
          options: ['Terminates switch block and transfers control to following statement', 'Exits entire program', 'Skips next case only', 'Restarts switch evaluation'],
          correct: 0,
          exp: 'break exits the switch block, preventing fall-through to consecutive cases.'
        },
        {
          q: 'Which format specifier is used in printf() to print a pointer address in hexadecimal?',
          options: ['%p', '%x', '%d', '%s'],
          correct: 0,
          exp: '%p is the standard format specifier for printing void pointer addresses.'
        },
        {
          q: 'What character terminates a standard C string literal?',
          options: ['\\0 (Null terminator)', '\\n (Newline)', '\\t (Tab)', '; (Semicolon)'],
          correct: 0,
          exp: 'C strings are contiguous null-terminated character sequences ending in \\0.'
        },
        {
          q: 'Which preprocessing directive is used to include header file contents in C?',
          options: ['#include', '#define', '#ifdef', '#pragma'],
          correct: 0,
          exp: '#include inserts the contents of the specified header file during preprocessing.'
        }
      ]
    },
    {
      id: 'quiz-cs-s2-01',
      title: 'Python Programming & Object-Oriented Structures',
      description: 'Comprehensive test on Python data model, decorators, inheritance, generators, and exception handling.',
      dept: 'CS',
      dept_id: 'dept-cs',
      sem: 2,
      batch_id: 'batch-cs-s2',
      subject_id: 'sub-cs201',
      subject_code: 'CS201',
      time_limit: 20,
      total_marks: 50,
      pass_percentage: 60,
      status: 'published',
      available_from: '2026-09-01T09:00:00Z',
      available_until: '2026-12-30T23:59:59Z',
      questions: [
        {
          q: 'Which built-in Python data structure is mutable and ordered?',
          options: ['list', 'tuple', 'frozenset', 'str'],
          correct: 0,
          exp: 'Lists in Python are mutable, ordered sequences.'
        },
        {
          q: 'What keyword turns a normal function into a generator that yields values lazily?',
          options: ['yield', 'return', 'await', 'generate'],
          correct: 0,
          exp: 'The yield keyword pauses function execution and returns a generator iterator.'
        },
        {
          q: 'Which dunder method is invoked when an object is instantiated to initialize its state?',
          options: ['__init__', '__new__', '__call__', '__str__'],
          correct: 0,
          exp: '__init__ is the initializer method called after instance creation.'
        },
        {
          q: 'What is the time complexity of looking up a key in a standard Python dictionary (average case)?',
          options: ['O(1)', 'O(n)', 'O(log n)', 'O(n^2)'],
          correct: 0,
          exp: 'Python dictionaries use hash tables, providing O(1) average lookup time.'
        },
        {
          q: 'Which Python statement is used to handle exceptions gracefully?',
          options: ['try-except', 'catch-throw', 'begin-rescue', 'guard-else'],
          correct: 0,
          exp: 'Python uses try-except blocks for exception handling.'
        },
        {
          q: 'What built-in function returns an iterator of tuples containing index and value?',
          options: ['enumerate()', 'zip()', 'range()', 'map()'],
          correct: 0,
          exp: 'enumerate() takes an iterable and returns (index, element) pairs.'
        },
        {
          q: 'Which symbol is used for variable positional arguments (*args) in function definitions?',
          options: ['* (Single asterisk)', '** (Double asterisk)', '& (Ampersand)', '... (Ellipsis)'],
          correct: 0,
          exp: '*args packs extra positional arguments into a tuple.'
        },
        {
          q: 'In Python, what does the Global Interpreter Lock (GIL) primarily restrict in CPython?',
          options: ['Execution of multiple native Python bytecodes concurrently on multi-core CPUs', 'Disk input/output throughput', 'Memory allocation bounds', 'Network socket binding'],
          correct: 0,
          exp: 'The GIL prevents multiple threads from executing Python bytecodes simultaneously.'
        },
        {
          q: 'Which module in standard Python provides regular expression support?',
          options: ['re', 'regex', 'pattern', 'stringmatch'],
          correct: 0,
          exp: 'The standard library module re handles regular expression operations.'
        },
        {
          q: 'What is the result of bool([]) in Python?',
          options: ['False', 'True', 'None', 'Error'],
          correct: 0,
          exp: 'Empty collections in Python evaluate to False in boolean contexts.'
        }
      ]
    },
    {
      id: 'quiz-cs-s3-01',
      title: 'Data Structures & Algorithmic Analysis Assessment',
      description: 'Advanced assessment on balanced search trees, graph traversals, dynamic programming, and complexity bounds.',
      dept: 'CS',
      dept_id: 'dept-cs',
      sem: 3,
      batch_id: 'batch-cs-s3',
      subject_id: 'sub-cs301',
      subject_code: 'CS301',
      time_limit: 25,
      total_marks: 50,
      pass_percentage: 60,
      status: 'published',
      available_from: '2026-09-01T09:00:00Z',
      available_until: '2026-12-30T23:59:59Z',
      questions: [
        {
          q: 'What is the worst-case time complexity of QuickSort?',
          options: ['O(n^2)', 'O(n log n)', 'O(n)', 'O(log n)'],
          correct: 0,
          exp: 'QuickSort has O(n^2) worst case when unbalanced partitions occur.'
        },
        {
          q: 'Which data structure is primarily used in Breadth-First Search (BFS) graph traversal?',
          options: ['Queue', 'Stack', 'Priority Queue', 'Disjoint Set'],
          correct: 0,
          exp: 'BFS uses a FIFO queue to explore nodes level-by-level.'
        },
        {
          q: 'In an AVL tree, what is the maximum allowable absolute difference in height between subtrees of any node?',
          options: ['1', '0', '2', 'log n'],
          correct: 0,
          exp: 'AVL balance factor balance must be in {-1, 0, 1}.'
        },
        {
          q: 'Which algorithm finds single-source shortest paths in weighted directed graphs without negative edges?',
          options: ["Dijkstra's Algorithm", "Kruskal's Algorithm", "Floyd-Warshall", "Tarjan's Algorithm"],
          correct: 0,
          exp: "Dijkstra's algorithm computes non-negative shortest path distances efficiently."
        },
        {
          q: 'What principle does a standard Call Stack follow?',
          options: ['LIFO (Last In First Out)', 'FIFO (First In First Out)', 'Priority-based', 'Random Access'],
          correct: 0,
          exp: 'Stacks operate strictly under Last In, First Out semantics.'
        },
        {
          q: 'Which tree traversal visits the root node between the left and right subtrees?',
          options: ['In-order traversal', 'Pre-order traversal', 'Post-order traversal', 'Level-order traversal'],
          correct: 0,
          exp: 'In-order traversal visits left subtree, current node, then right subtree.'
        },
        {
          q: 'What is the time complexity of inserting into a max-heap of n elements?',
          options: ['O(log n)', 'O(1)', 'O(n)', 'O(n log n)'],
          correct: 0,
          exp: 'Heap insertion involves placing at bottom and bubbling up at most tree height O(log n).'
        },
        {
          q: 'Which algorithm design paradigm does MergeSort exemplify?',
          options: ['Divide and Conquer', 'Greedy Choice', 'Dynamic Programming', 'Backtracking'],
          correct: 0,
          exp: 'MergeSort divides the array into halves, sorts them recursively, and merges.'
        },
        {
          q: 'In a hash table, what strategy resolves collisions by searching for the next empty bucket sequentially?',
          options: ['Linear Probing', 'Separate Chaining', 'Quadratic Hashing', 'Double Hashing'],
          correct: 0,
          exp: 'Linear probing searches consecutive slots until an empty slot is encountered.'
        },
        {
          q: 'What is the minimum number of edges in a connected undirected graph with V vertices?',
          options: ['V - 1', 'V', 'V + 1', 'V(V-1)/2'],
          correct: 0,
          exp: 'A connected graph with V vertices requires at least V - 1 edges (spanning tree).'
        }
      ]
    },
    // CS-S4 (Alex Rivera cohort): 3 Assessments (Active, Upcoming, Completed for Retest testing)
    {
      id: 'quiz-cs-s4-01',
      title: 'Database Management Systems Midterm Quiz',
      description: 'Examination on Relational Algebra, SQL query optimization, 3NF/BCNF normalization, and ACID transaction locks.',
      dept: 'CS',
      dept_id: 'dept-cs',
      sem: 4,
      batch_id: 'batch-cs-s4',
      subject_id: 'sub-cs401',
      subject_code: 'CS401',
      time_limit: 30,
      total_marks: 50,
      pass_percentage: 60,
      status: 'published',
      available_from: '2026-10-01T09:00:00Z',
      available_until: '2026-12-31T23:59:59Z',
      questions: [
        {
          q: 'In relational database theory, which Normal Form guarantees the absence of transitive functional dependencies on candidate keys?',
          options: ['Third Normal Form (3NF)', 'First Normal Form (1NF)', 'Second Normal Form (2NF)', 'Denormalized Form'],
          correct: 0,
          exp: '3NF requires that no non-prime attribute is transitively dependent on any candidate key.'
        },
        {
          q: 'What is the primary objective of a Write-Ahead Log (WAL) in database transaction management?',
          options: ['Guarantee Atomicity and Durability across system crashes', 'Compress disk table spaces', 'Speed up in-memory joins', 'Encrypt client traffic'],
          correct: 0,
          exp: 'WAL ensures that changes are logged to non-volatile storage before being written to disk data pages.'
        },
        {
          q: 'Which disk indexing tree structure is guaranteed to be completely height-balanced with leaves stored at equal depth?',
          options: ['B+ Tree', 'Binary Search Tree', 'Trie Index', 'Skip List'],
          correct: 0,
          exp: 'B+ Trees maintain uniform depth for all leaf pages, ensuring predictable block read times.'
        },
        {
          q: 'In SQL, which clause filters rows produced by an aggregate GROUP BY query?',
          options: ['HAVING', 'WHERE', 'ORDER BY', 'LIMIT'],
          correct: 0,
          exp: 'HAVING applies filter predicates to aggregated group results, whereas WHERE filters individual rows.'
        },
        {
          q: 'Which ACID property guarantees that all operations within a transaction are completed or none are applied?',
          options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
          correct: 0,
          exp: 'Atomicity enforces all-or-nothing execution semantics.'
        },
        {
          q: 'What isolation level prevents dirty reads, non-repeatable reads, and phantom reads simultaneously?',
          options: ['Serializable', 'Read Committed', 'Repeatable Read', 'Read Uncommitted'],
          correct: 0,
          exp: 'Serializable is the highest isolation level and prevents all concurrency anomalies.'
        },
        {
          q: 'Which join type returns all rows from the left table and matched rows from the right table?',
          options: ['LEFT OUTER JOIN', 'INNER JOIN', 'CROSS JOIN', 'RIGHT OUTER JOIN'],
          correct: 0,
          exp: 'LEFT OUTER JOIN keeps all records from the left relation, filling missing right columns with NULL.'
        },
        {
          q: 'In Boyce-Codd Normal Form (BCNF), for every functional dependency X -> Y, what must X be?',
          options: ['A Superkey', 'A Foreign key', 'A Primary candidate', 'A Derived attribute'],
          correct: 0,
          exp: 'BCNF requires that the determinant X in every non-trivial functional dependency is a superkey.'
        },
        {
          q: 'What concurrency control protocol divides transaction execution into growing and shrinking phases?',
          options: ['Two-Phase Locking (2PL)', 'Timestamp Ordering', 'Optimistic Concurrency Control', 'Multi-Version Concurrency Control'],
          correct: 0,
          exp: '2PL ensures conflict serializability by acquiring all locks before releasing any lock.'
        },
        {
          q: 'Which database index type works best for low-cardinality columns (e.g. gender, status)?',
          options: ['Bitmap Index', 'B-Tree Index', 'Hash Index', 'Spatial R-Tree'],
          correct: 0,
          exp: 'Bitmap indexes use bit arrays for distinct values and are highly effective for low-cardinality fields.'
        }
      ]
    },
    {
      id: 'quiz-cs-s4-02',
      title: 'Operating Systems & Kernel Architecture Assessment',
      description: 'Midterm assessment on Virtual Memory, paging, TLB caches, process scheduling algorithms, and deadlock avoidance.',
      dept: 'CS',
      dept_id: 'dept-cs',
      sem: 4,
      batch_id: 'batch-cs-s4',
      subject_id: 'sub-cs402',
      subject_code: 'CS402',
      time_limit: 30,
      total_marks: 50,
      pass_percentage: 60,
      status: 'published',
      available_from: '2026-11-05T09:00:00Z', // Upcoming!
      available_until: '2026-12-31T23:59:59Z',
      questions: [
        {
          q: 'What hardware component accelerates virtual-to-physical address translation in modern CPUs?',
          options: ['Translation Lookaside Buffer (TLB)', 'Direct Memory Access (DMA)', 'Arithmetic Logic Unit (ALU)', 'Programmable Interrupt Controller (PIC)'],
          correct: 0,
          exp: 'The TLB is a dedicated hardware associative cache for page table entries.'
        },
        {
          q: 'Which CPU scheduling algorithm gives priority to processes with the shortest remaining execution time?',
          options: ['Shortest Remaining Time First (SRTF)', 'Round Robin (RR)', 'First-Come First-Served (FCFS)', 'Priority Inversion'],
          correct: 0,
          exp: 'SRTF is the preemptive version of Shortest Job First scheduling.'
        },
        {
          q: 'What condition causes thrashing in an operating system?',
          options: ['Processes spend more time paging than executing instructions', 'High CPU utilization with no I/O', 'Too many network interrupts', 'Stack overflow in user space'],
          correct: 0,
          exp: 'Thrashing occurs when the total working set exceeds physical memory, causing constant page swapping.'
        },
        {
          q: 'Which algorithm is used for deadlock avoidance in multi-resource systems?',
          options: ["Banker's Algorithm", "Peterson's Algorithm", "Bakery Algorithm", "Round Robin"],
          correct: 0,
          exp: "Dijkstra's Banker's algorithm tests for safe states prior to granting resource requests."
        },
        {
          q: 'What system call is used in Unix-like systems to create a child process by duplicating the calling process?',
          options: ['fork()', 'exec()', 'clone()', 'spawn()'],
          correct: 0,
          exp: 'fork() creates an identical copy of the calling process address space.'
        },
        {
          q: 'In mutual exclusion, what synchronization primitive provides a semaphore initialized to 1?',
          options: ['Binary Semaphore / Mutex', 'Counting Semaphore', 'Spinlock', 'Barrier'],
          correct: 0,
          exp: 'A binary semaphore has values restricted to 0 and 1, functioning as a mutual exclusion lock.'
        },
        {
          q: 'Which page replacement algorithm suffers from Belady’s anomaly?',
          options: ['First-In First-Out (FIFO)', 'Least Recently Used (LRU)', 'Optimal Algorithm (OPT)', 'Clock Algorithm'],
          correct: 0,
          exp: 'Under FIFO page replacement, increasing page frames can paradoxically increase page faults.'
        },
        {
          q: 'What mechanism prevents low-priority processes from starving indefinitely in priority scheduling?',
          options: ['Aging', 'Paging', 'Swapping', 'Spooling'],
          correct: 0,
          exp: 'Aging gradually increases process priority as it waits in the ready queue.'
        },
        {
          q: 'What is a race condition in concurrent programming?',
          options: ['Outcome depends on the non-deterministic order of execution of threads', 'Two processes waiting on each other indefinitely', 'A process using 100% of CPU cycles', 'Memory leak over long runtime'],
          correct: 0,
          exp: 'A race condition occurs when concurrent threads access shared data without proper synchronization.'
        },
        {
          q: 'What table maps logical page numbers to physical page frames?',
          options: ['Page Table', 'Inverted Segment Table', 'Descriptor Table', 'Interrupt Vector Table'],
          correct: 0,
          exp: 'The Page Table maintains the mapping between virtual pages and physical memory frames.'
        }
      ]
    },
    {
      id: 'quiz-cs-s4-03',
      title: 'Design and Analysis of Algorithms Quiz',
      description: 'Completed certification assessment on greedy algorithms, asymptotic notations, and NP-completeness.',
      dept: 'CS',
      dept_id: 'dept-cs',
      sem: 4,
      batch_id: 'batch-cs-s4',
      subject_id: 'sub-cs403',
      subject_code: 'CS403',
      time_limit: 25,
      total_marks: 50,
      pass_percentage: 60,
      status: 'published',
      available_from: '2026-09-01T09:00:00Z',
      available_until: '2026-12-31T23:59:59Z',
      questions: [
        {
          q: 'Which algorithmic paradigm does Kruskal’s Minimum Spanning Tree algorithm use?',
          options: ['Greedy Approach', 'Dynamic Programming', 'Divide and Conquer', 'Branch and Bound'],
          correct: 0,
          exp: 'Kruskal’s algorithm greedily chooses the smallest edge that does not form a cycle.'
        },
        {
          q: 'What complexity class contains decision problems verifiable in polynomial time by a deterministic Turing machine?',
          options: ['NP (Nondeterministic Polynomial)', 'P', 'EXPTIME', 'PSPACE'],
          correct: 0,
          exp: 'NP consists of decision problems whose solutions can be verified in polynomial time.'
        },
        {
          q: 'What is the tightest asymptotic upper bound representation?',
          options: ['Big O notation (O)', 'Big Omega notation (Ω)', 'Big Theta notation (Θ)', 'Little o notation (o)'],
          correct: 0,
          exp: 'Big O characterizes the asymptotic upper bound of an algorithm.'
        },
        {
          q: 'What is the optimal substructure property in dynamic programming?',
          options: ['An optimal solution to problem contains optimal solutions to subproblems', 'Problems cannot be decomposed', 'Subproblems never overlap', 'Recursive tree has constant depth'],
          correct: 0,
          exp: 'Optimal substructure means optimal solutions to subproblems combine into an overall optimal solution.'
        },
        {
          q: 'What is the recurrence relation for the Tower of Hanoi problem with n disks?',
          options: ['T(n) = 2T(n-1) + 1', 'T(n) = T(n-1) + n', 'T(n) = 2T(n/2) + n', 'T(n) = T(n/2) + 1'],
          correct: 0,
          exp: 'Moving n disks requires moving n-1 disks twice plus 1 move for the largest disk: 2T(n-1) + 1.'
        },
        {
          q: 'What is the time complexity of the Floyd-Warshall all-pairs shortest path algorithm?',
          options: ['O(V^3)', 'O(V^2 log V)', 'O(V E)', 'O(E log V)'],
          correct: 0,
          exp: 'Floyd-Warshall uses three nested loops over all vertices, giving O(V^3).'
        },
        {
          q: 'Which problem was the first proven to be NP-Complete (Cook-Levin theorem)?',
          options: ['Boolean Satisfiability (SAT)', 'Travelling Salesperson (TSP)', 'Graph Coloring', 'Knapsack Problem'],
          correct: 0,
          exp: 'The Cook-Levin theorem established that the Boolean Satisfiability Problem (SAT) is NP-Complete.'
        },
        {
          q: 'What data structure is used to optimize Prim’s algorithm to O(E log V) time?',
          options: ['Fibonacci / Binary Heap', 'Linked List', 'Array', 'Hash Map'],
          correct: 0,
          exp: 'A priority queue (binary or Fibonacci heap) allows fast min-edge extraction.'
        },
        {
          q: 'In the Master Theorem for divide-and-conquer, T(n) = 2T(n/2) + O(n) resolves to what complexity?',
          options: ['O(n log n)', 'O(n)', 'O(n^2)', 'O(log n)'],
          correct: 0,
          exp: 'By Case 2 of the Master Theorem (log_b(a) = log_2(2) = 1), T(n) = Θ(n log n).'
        },
        {
          q: 'Which algorithm solves the 0/1 Knapsack problem optimally?',
          options: ['Dynamic Programming', 'Greedy fractional choice', 'Breadth First Search', 'Hill Climbing'],
          correct: 0,
          exp: '0/1 Knapsack requires dynamic programming due to non-divisible discrete items.'
        }
      ]
    },
    // CS-S5 & S6
    {
      id: 'quiz-cs-s5-01',
      title: 'Computer Networks & Security Protocols',
      description: 'Assessment on TCP/IP layers, TLS handshakes, routing protocols (BGP/OSPF), and cryptographic ciphers.',
      dept: 'CS',
      dept_id: 'dept-cs',
      sem: 5,
      batch_id: 'batch-cs-s5',
      subject_id: 'sub-cs501',
      subject_code: 'CS501',
      time_limit: 25,
      total_marks: 50,
      pass_percentage: 60,
      status: 'published',
      available_from: '2026-09-01T09:00:00Z',
      available_until: '2026-12-31T23:59:59Z',
      questions: [
        {
          q: 'What layer of the OSI model does the Transport Layer Security (TLS) protocol operate at?',
          options: ['Between Transport and Application layers', 'Physical layer', 'Data Link layer', 'Network layer'],
          correct: 0,
          exp: 'TLS operates above the transport layer (TCP) to provide secure communications for application protocols.'
        },
        {
          q: 'Which protocol translates domain names into IP addresses?',
          options: ['DNS', 'DHCP', 'ARP', 'ICMP'],
          correct: 0,
          exp: 'Domain Name System (DNS) maps human-readable domain names to numerical IP addresses.'
        },
        {
          q: 'What mechanism does TCP use to control sender transmission rate based on network congestion?',
          options: ['Congestion Window (cwnd) & Slow Start', 'Checksum', 'Sequence Numbering', 'MAC address filtering'],
          correct: 0,
          exp: 'TCP congestion control employs Slow Start, Congestion Avoidance, and Fast Recovery.'
        },
        {
          q: 'Which routing protocol is an exterior gateway protocol used to route traffic across the global Internet?',
          options: ['Border Gateway Protocol (BGP)', 'OSPF', 'RIP', 'IS-IS'],
          correct: 0,
          exp: 'BGP is the de facto path-vector protocol managing inter-autonomous system routing.'
        },
        {
          q: 'What is the length of an IPv6 address in bits?',
          options: ['128 bits', '32 bits', '64 bits', '256 bits'],
          correct: 0,
          exp: 'IPv6 uses 128-bit addresses compared to 32 bits for IPv4.'
        },
        {
          q: 'Which asymmetric encryption algorithm relies on the mathematical difficulty of factoring large prime products?',
          options: ['RSA', 'AES', 'DES', 'Blowfish'],
          correct: 0,
          exp: 'RSA security is based on the computational hardness of the integer factorization problem.'
        },
        {
          q: 'What port does secure HTTP (HTTPS) operate on by default?',
          options: ['443', '80', '8080', '22'],
          correct: 0,
          exp: 'Standard HTTPS traffic uses TCP port 443.'
        },
        {
          q: 'Which protocol is used to map an IPv4 address to its physical hardware MAC address?',
          options: ['Address Resolution Protocol (ARP)', 'RARP', 'NAT', 'IGMP'],
          correct: 0,
          exp: 'ARP resolves network layer IPv4 addresses to link layer MAC addresses on the local segment.'
        },
        {
          q: 'In a TCP three-way handshake, what is the order of packet flags exchanged?',
          options: ['SYN -> SYN-ACK -> ACK', 'ACK -> SYN -> SYN-ACK', 'SYN -> ACK -> FIN', 'FIN -> ACK -> FIN-ACK'],
          correct: 0,
          exp: 'TCP connection establishment follows: Client SYN, Server SYN-ACK, Client ACK.'
        },
        {
          q: 'What symmetric encryption algorithm is the current NIST standard worldwide?',
          options: ['Advanced Encryption Standard (AES)', 'Data Encryption Standard (DES)', 'RC4', 'MD5'],
          correct: 0,
          exp: 'AES (Rijndael) is the federal standard for symmetric block cipher encryption.'
        }
      ]
    },
    {
      id: 'quiz-cs-s6-01',
      title: 'Artificial Intelligence & Machine Learning Assessment',
      description: 'Assessment on neural networks, gradient descent, SVMs, clustering, and reinforcement learning.',
      dept: 'CS',
      dept_id: 'dept-cs',
      sem: 6,
      batch_id: 'batch-cs-s6',
      subject_id: 'sub-cs601',
      subject_code: 'CS601',
      time_limit: 30,
      total_marks: 50,
      pass_percentage: 60,
      status: 'published',
      available_from: '2026-09-01T09:00:00Z',
      available_until: '2026-12-31T23:59:59Z',
      questions: [
        {
          q: 'Which activation function maps real numbers to the range (0, 1) and is commonly used for binary classification output?',
          options: ['Sigmoid', 'ReLU', 'Tanh', 'Linear'],
          correct: 0,
          exp: 'The Sigmoid function 1 / (1 + e^-z) outputs probabilities in the range (0, 1).'
        },
        {
          q: 'What problem does the Rectified Linear Unit (ReLU) activation function help alleviate in deep networks?',
          options: ['Vanishing Gradient Problem', 'Overfitting', 'Underfitting', 'Curse of Dimensionality'],
          correct: 0,
          exp: 'ReLU has constant derivative 1 for positive inputs, reducing vanishing gradients.'
        },
        {
          q: 'In unsupervised learning, what algorithm partitions n observations into k clusters around centroids?',
          options: ['K-Means Clustering', 'K-Nearest Neighbors', 'Logistic Regression', 'Decision Tree'],
          correct: 0,
          exp: 'K-Means partitions data points into k distinct clusters by minimizing inertia to centroids.'
        },
        {
          q: 'What technique prevents overfitting by adding a penalty proportional to the magnitude of weights (L2 norm)?',
          options: ['Ridge Regularization (Weight Decay)', 'Lasso Regularization (L1)', 'Batch Normalization', 'Dropout'],
          correct: 0,
          exp: 'L2 Ridge regularization penalizes the squared Euclidean norm of weights.'
        },
        {
          q: 'What is the primary objective of Backpropagation in neural networks?',
          options: ['Compute the gradients of the loss function with respect to weights using the chain rule', 'Forward propagate inputs', 'Initialize random weights', 'Prune dead neurons'],
          correct: 0,
          exp: 'Backpropagation applies the calculus chain rule to calculate loss gradients efficiently.'
        },
        {
          q: 'Which metric measures the fraction of true positive predictions among all positive calls made by the model?',
          options: ['Precision', 'Recall', 'Accuracy', 'Specificity'],
          correct: 0,
          exp: 'Precision = TP / (TP + FP), indicating the purity of positive predictions.'
        },
        {
          q: 'In reinforcement learning, what equation defines the optimal state-value function recursively?',
          options: ['Bellman Equation', 'Bayes Theorem', 'Markov Chain', 'Euler-Lagrange Equation'],
          correct: 0,
          exp: 'The Bellman optimality equation expresses the value of a state as expected immediate reward plus discounted future value.'
        },
        {
          q: 'What is the Curse of Dimensionality in machine learning?',
          options: ['Data becomes sparse and distances between points become equidistant as feature dimensions grow', 'Training takes infinite time', 'Neural networks always overfit', 'Data points become redundant'],
          correct: 0,
          exp: 'In high-dimensional space, data volume grows exponentially, causing extreme sparsity and geometric distortion.'
        },
        {
          q: 'Which machine learning model finds the optimal hyperplane that maximizes the margin between classes?',
          options: ['Support Vector Machine (SVM)', 'Naive Bayes', 'Random Forest', 'Perceptron'],
          correct: 0,
          exp: 'SVM constructs maximum-margin separating hyperplanes.'
        },
        {
          q: 'What neural architecture uses self-attention mechanisms to process sequential data in parallel?',
          options: ['Transformer', 'Recurrent Neural Network (RNN)', 'Convolutional Neural Network (CNN)', 'Multilayer Perceptron (MLP)'],
          correct: 0,
          exp: 'Transformers rely entirely on self-attention mechanisms without recurrence.'
        }
      ]
    },

    // ----------------------------------------------------
    // ELECTRONICS & COMMUNICATION (EC)
    // ----------------------------------------------------
    {
      id: 'quiz-ec-s1-01',
      title: 'Basic Electronics & Network Analysis',
      description: 'Assessment on Ohm’s Law, Kirchhoff’s circuit laws, Thevenin/Norton equivalents, and PN junction diodes.',
      dept: 'EC',
      dept_id: 'dept-ec',
      sem: 1,
      batch_id: 'batch-ec-s1',
      subject_id: 'sub-ec101',
      subject_code: 'EC101',
      time_limit: 20,
      total_marks: 50,
      pass_percentage: 60,
      status: 'published',
      available_from: '2026-09-01T09:00:00Z',
      available_until: '2026-12-31T23:59:59Z',
      questions: [
        {
          q: 'What does Kirchhoff’s Current Law (KCL) state regarding any electrical junction node?',
          options: ['Sum of currents entering node equals sum of currents leaving node', 'Voltage drop across node is zero', 'Current equals voltage squared', 'Power dissipation is maximized'],
          correct: 0,
          exp: 'KCL is a manifestation of conservation of electric charge.'
        },
        {
          q: 'What is the barrier potential of a standard silicon PN junction diode at room temperature (approx 300K)?',
          options: ['0.7 V', '0.3 V', '1.2 V', '5.0 V'],
          correct: 0,
          exp: 'Silicon diodes typically have a forward barrier potential of approximately 0.7V.'
        },
        {
          q: 'According to Thevenin’s Theorem, any linear two-terminal circuit can be replaced by:',
          options: ['A single voltage source in series with a resistor', 'A single current source in parallel with a resistor', 'A single capacitor and inductor', 'A dependent source in series with ground'],
          correct: 0,
          exp: 'Thevenin equivalent consists of V_th in series with R_th.'
        },
        {
          q: 'What is the unit of electrical capacitance in the SI system?',
          options: ['Farad (F)', 'Henry (H)', 'Ohm (Ω)', 'Tesla (T)'],
          correct: 0,
          exp: 'Capacitance is measured in Farads (coulombs per volt).'
        },
        {
          q: 'What device operates in the reverse breakdown region to provide stable voltage regulation?',
          options: ['Zener Diode', 'LED', 'Photodiode', 'Schottky Diode'],
          correct: 0,
          exp: 'Zener diodes are engineered to conduct in reverse breakdown with near-constant voltage.'
        },
        {
          q: 'What is the relationship between frequency f and angular frequency ω in AC circuits?',
          options: ['ω = 2πf', 'ω = f / 2π', 'ω = πf', 'ω = 4πf'],
          correct: 0,
          exp: 'Angular frequency in radians per second is given by ω = 2πf.'
        },
        {
          q: 'What theorem states that maximum power is transferred to a load when load resistance equals Thevenin resistance?',
          options: ['Maximum Power Transfer Theorem', 'Superposition Theorem', 'Reciprocity Theorem', 'Millman’s Theorem'],
          correct: 0,
          exp: 'Maximum power transfer occurs when R_L = R_th in DC resistive circuits.'
        },
        {
          q: 'What is the current gain factor β in a Common-Emitter BJT transistor configuration?',
          options: ['I_c / I_b', 'I_e / I_b', 'I_c / I_e', 'I_b / I_c'],
          correct: 0,
          exp: 'Beta (β) is the DC current gain defined as collector current divided by base current.'
        },
        {
          q: 'What type of filter allows frequencies below a cutoff frequency and attenuates higher frequencies?',
          options: ['Low-Pass Filter (LPF)', 'High-Pass Filter (HPF)', 'Band-Pass Filter (BPF)', 'Notch Filter'],
          correct: 0,
          exp: 'A Low-Pass Filter transmits low-frequency signals while suppressing high frequencies.'
        },
        {
          q: 'What is the ideal input impedance of an operational amplifier?',
          options: ['Infinite (∞)', 'Zero (0)', '50 Ohms', '1 Megaohm'],
          correct: 0,
          exp: 'An ideal op-amp exhibits infinite input impedance, drawing zero input current.'
        }
      ]
    },
    {
      id: 'quiz-ec-s2-01',
      title: 'Digital Electronics & Logic Design',
      description: 'Examination on Boolean algebra, Karnaugh Maps, combinational multiplexers, flip-flops, and sequential counters.',
      dept: 'EC',
      dept_id: 'dept-ec',
      sem: 2,
      batch_id: 'batch-ec-s2',
      subject_id: 'sub-ec202',
      subject_code: 'EC202',
      time_limit: 25,
      total_marks: 50,
      pass_percentage: 60,
      status: 'published',
      available_from: '2026-09-01T09:00:00Z',
      available_until: '2026-12-31T23:59:59Z',
      questions: [
        {
          q: 'Which logic gate produces a HIGH output only when both of its inputs are distinct (different)?',
          options: ['XOR Gate', 'AND Gate', 'NOR Gate', 'XNOR Gate'],
          correct: 0,
          exp: 'Exclusive-OR (XOR) outputs 1 when inputs are unequal (0,1 or 1,0).'
        },
        {
          q: 'Which pair of logic gates are known as Universal Gates because any Boolean logic can be constructed using them?',
          options: ['NAND and NOR', 'AND and OR', 'XOR and XNOR', 'NOT and AND'],
          correct: 0,
          exp: 'NAND and NOR can synthesize any arbitrary Boolean function independently.'
        },
        {
          q: 'According to De Morgan’s theorem, (A + B)’ is algebraically equal to:',
          options: ["A' . B'", "A' + B'", "A . B", "(A . B)'"],
          correct: 0,
          exp: 'De Morgan’s law states the complement of a sum equals the product of the complements.'
        },
        {
          q: 'What is the primary function of a multiplexer (MUX)?',
          options: ['Selects one of many input signals and routes to single output line', 'Converts analog to digital', 'Stores bit sequence in memory', 'Decodes binary addresses'],
          correct: 0,
          exp: 'A Multiplexer (data selector) routes one of 2^n inputs to a single output using n select lines.'
        },
        {
          q: 'In a JK flip-flop, what output behavior occurs when both J and K inputs are set to logic HIGH (1)?',
          options: ['Toggle (Q becomes Q-bar)', 'No change', 'Set to 1', 'Reset to 0'],
          correct: 0,
          exp: 'When J=1 and K=1, the output toggles on every clock pulse.'
        },
        {
          q: 'How many flip-flops are required to construct a MOD-16 synchronous counter?',
          options: ['4', '16', '8', '2'],
          correct: 0,
          exp: '2^n >= 16 requires n = 4 flip-flops.'
        },
        {
          q: 'What is the Gray code equivalent of binary 1010?',
          options: ['1111', '1001', '1100', '1011'],
          correct: 0,
          exp: 'Binary to Gray: MSB unchanged (1), then XOR adjacent bits: 1 XOR 0 = 1, 0 XOR 1 = 1, 1 XOR 0 = 1 -> 1111.'
        },
        {
          q: 'What circuit adds three binary bits (two significant bits and one incoming carry)?',
          options: ['Full Adder', 'Half Adder', 'Ripple Carry Adder', 'Comparator'],
          correct: 0,
          exp: 'A Full Adder adds A, B, and Carry-in producing Sum and Carry-out.'
        },
        {
          q: 'What is the resolution of an 8-bit digital-to-analog converter with 5V full-scale reference?',
          options: ['5V / 255 ≈ 19.6 mV', '5V / 8 = 0.625 V', '5V / 1024 ≈ 4.8 mV', '1 V'],
          correct: 0,
          exp: 'Resolution is V_ref / (2^n - 1) = 5 / 255 = 19.6 mV.'
        },
        {
          q: 'What type of memory loses its stored contents immediately when power is disconnected?',
          options: ['Volatile Memory (e.g. SRAM/DRAM)', 'ROM', 'Flash EEPROM', 'Magnetic Disk'],
          correct: 0,
          exp: 'Volatile RAM requires continuous electrical power to maintain bit state.'
        }
      ]
    },
    {
      id: 'quiz-ec-s4-01',
      title: 'Microprocessors and Microcontrollers Assessment',
      description: 'Certification assessment on 8086/ARM architecture, assembly registers, memory segmentation, interrupts, and 8051 timers.',
      dept: 'EC',
      dept_id: 'dept-ec',
      sem: 4,
      batch_id: 'batch-ec-s4',
      subject_id: 'sub-ec402',
      subject_code: 'EC402',
      time_limit: 25,
      total_marks: 50,
      pass_percentage: 60,
      status: 'published',
      available_from: '2026-09-01T09:00:00Z',
      available_until: '2026-12-31T23:59:59Z',
      questions: [
        {
          q: 'What is the width of the external address bus in the 8086 microprocessor, and what maximum memory can it address?',
          options: ['20-bit address bus, addressing up to 1 MB memory', '16-bit address bus, addressing 64 KB', '32-bit address bus, addressing 4 GB', '8-bit address bus, addressing 256 bytes'],
          correct: 0,
          exp: 'The 8086 has a 20-bit address bus allowing 2^20 = 1,048,576 bytes (1 MB) address space.'
        },
        {
          q: 'In 8086 segmentation, how is the physical 20-bit memory address calculated from Segment and Offset registers?',
          options: ['(Segment << 4) + Offset', 'Segment + Offset', 'Segment * Offset', '(Offset << 4) + Segment'],
          correct: 0,
          exp: 'Physical address = (Segment * 16) + Offset, which shifts segment 4 bits left.'
        },
        {
          q: 'Which register in 8086 serves as the default Loop Counter in loop instructions?',
          options: ['CX register', 'AX register', 'DX register', 'BX register'],
          correct: 0,
          exp: 'The Count register (CX) is automatically decremented by the LOOP instruction.'
        },
        {
          q: 'What type of interrupt in 8086 cannot be disabled or masked by software (via CLI instruction)?',
          options: ['Non-Maskable Interrupt (NMI)', 'INTR', 'INT 21h', 'Timer Interrupt'],
          correct: 0,
          exp: 'NMI is a dedicated hardware pin that cannot be masked by the Interrupt Flag.'
        },
        {
          q: 'In the 8051 microcontroller, how many 8-bit bidirectional I/O ports are available?',
          options: ['4 ports (P0, P1, P2, P3)', '2 ports', '8 ports', '1 port'],
          correct: 0,
          exp: 'The 8051 has four 8-bit parallel I/O ports: P0, P1, P2, and P3.'
        },
        {
          q: 'What is the size of the on-chip internal RAM in the standard 8051 microcontroller?',
          options: ['128 bytes', '256 KB', '4 KB', '64 bytes'],
          correct: 0,
          exp: 'Standard 8051 features 128 bytes of internal scratchpad RAM.'
        },
        {
          q: 'What architecture distinguishes microcontrollers with separate instruction and data memory buses?',
          options: ['Harvard Architecture', 'Von Neumann Architecture', 'Turing Architecture', 'Unified Memory Architecture'],
          correct: 0,
          exp: 'Harvard architecture employs physically separate memories and buses for instructions and data.'
        },
        {
          q: 'In ARM Cortex-M processors, what is the primary exception handler vector controller?',
          options: ['Nested Vectored Interrupt Controller (NVIC)', '8259 PIC', 'APIC', 'DMA Controller'],
          correct: 0,
          exp: 'NVIC provides low-latency, deterministic interrupt handling for ARM Cortex-M.'
        },
        {
          q: 'What register in 8086 holds the status condition flags (Zero, Carry, Sign, Overflow)?',
          options: ['FLAGS Register', 'Instruction Pointer (IP)', 'Stack Pointer (SP)', 'Base Pointer (BP)'],
          correct: 0,
          exp: 'The 16-bit FLAGS register stores conditional and control status flags.'
        },
        {
          q: 'Which communication protocol uses two wires: SCL (Serial Clock) and SDA (Serial Data)?',
          options: ['I2C (Inter-Integrated Circuit)', 'SPI', 'UART', 'CAN'],
          correct: 0,
          exp: 'I2C uses two bidirectional open-drain lines: Serial Clock and Serial Data.'
        }
      ]
    },
    {
      id: 'quiz-ec-s3-01',
      title: 'Analog Circuits & Linear ICs Assessment',
      description: 'Assessment on Op-Amp configurations, differential gain, CMRR, 555 timer multivibrators, and Active Filters.',
      dept: 'EC',
      dept_id: 'dept-ec',
      sem: 3,
      batch_id: 'batch-ec-s3',
      subject_id: 'sub-ec301',
      subject_code: 'EC301',
      time_limit: 20,
      total_marks: 50,
      pass_percentage: 60,
      status: 'published',
      available_from: '2026-09-01T09:00:00Z',
      available_until: '2026-12-31T23:59:59Z',
      questions: [
        {
          q: 'What is Common Mode Rejection Ratio (CMRR) in differential operational amplifiers?',
          options: ['Ratio of differential gain to common-mode gain (A_d / A_cm)', 'Ratio of input to output impedance', 'Unity gain bandwidth product', 'Slew rate divided by frequency'],
          correct: 0,
          exp: 'CMRR measures an amplifier’s ability to reject common-mode noise.'
        },
        {
          q: 'In an inverting op-amp configuration with R1 = 10kΩ and Rf = 100kΩ, what is the closed-loop voltage gain?',
          options: ['-10', '+10', '-0.1', '+100'],
          correct: 0,
          exp: 'Inverting gain A_v = -Rf / R1 = -100k / 10k = -10.'
        },
        {
          q: 'What is the maximum rate of change of output voltage per unit time in an op-amp called?',
          options: ['Slew Rate', 'Propagation Delay', 'Rise Time', 'Settling Time'],
          correct: 0,
          exp: 'Slew rate (typically in V/μs) defines the maximum output voltage rate of change.'
        },
        {
          q: 'What type of multivibrator generates continuous square-wave oscillations without an external trigger?',
          options: ['Astable Multivibrator', 'Monostable Multivibrator', 'Bistable Multivibrator', 'Schmitt Trigger'],
          correct: 0,
          exp: 'An astable multivibrator has no stable states and continuously oscillates.'
        },
        {
          q: 'In a 555 timer IC, what fraction of Vcc sets the upper internal threshold voltage comparator?',
          options: ['2/3 Vcc', '1/3 Vcc', '1/2 Vcc', '3/4 Vcc'],
          correct: 0,
          exp: 'The internal 3x 5kΩ resistor ladder sets the upper threshold at 2/3 Vcc.'
        },
        {
          q: 'Which active filter topology uses a single op-amp with two resistors and two capacitors to yield a second-order response?',
          options: ['Sallen-Key Topology', 'State-Variable Filter', 'Twin-T Filter', 'Butterworth Ladder'],
          correct: 0,
          exp: 'Sallen-Key is the widely used single op-amp second-order active filter topology.'
        },
        {
          q: 'What virtual concept occurs at an op-amp’s inverting terminal when the non-inverting terminal is tied to 0V ground?',
          options: ['Virtual Ground', 'Earth Loop', 'Floating Ground', 'Chassis Ground'],
          correct: 0,
          exp: 'Due to infinite open-loop gain and zero differential voltage, the inverting terminal is at virtual ground.'
        },
        {
          q: 'What circuit produces an output proportional to the mathematical integral of the input signal?',
          options: ['Op-Amp Integrator', 'Differentiator', 'Logarithmic Amplifier', 'Peak Detector'],
          correct: 0,
          exp: 'An op-amp with a feedback capacitor performs analog integration of the input voltage.'
        },
        {
          q: 'What Barkhausen criterion must be satisfied for sustained sinusoidal oscillations?',
          options: ['Loop gain |Aβ| = 1 and phase shift = 0° (or 360°)', 'Loop gain |Aβ| < 1', 'Phase shift = 90°', 'Input impedance = 0'],
          correct: 0,
          exp: 'Barkhausen criteria require loop gain magnitude unity and total loop phase shift zero.'
        },
        {
          q: 'What type of feedback is applied in precision amplifier circuits to stabilize gain and widen bandwidth?',
          options: ['Negative Feedback', 'Positive Feedback', 'Regenerative Feedback', 'No Feedback'],
          correct: 0,
          exp: 'Negative feedback trades raw gain for gain stability, linearity, and extended bandwidth.'
        }
      ]
    },
    {
      id: 'quiz-ec-s5-01',
      title: 'Digital Communication Engineering Assessment',
      description: 'Assessment on Nyquist sampling, PCM quantization, QPSK/QAM constellations, and matched filters.',
      dept: 'EC',
      dept_id: 'dept-ec',
      sem: 5,
      batch_id: 'batch-ec-s5',
      subject_id: 'sub-ec501',
      subject_code: 'EC501',
      time_limit: 20,
      total_marks: 50,
      pass_percentage: 60,
      status: 'published',
      available_from: '2026-09-01T09:00:00Z',
      available_until: '2026-12-31T23:59:59Z',
      questions: [
        {
          q: 'According to the Nyquist Sampling Theorem, what minimum sampling frequency f_s prevents aliasing for bandwidth W?',
          options: ['f_s >= 2W', 'f_s >= W', 'f_s = W / 2', 'f_s = 4W'],
          correct: 0,
          exp: 'Nyquist rate dictates sampling at least twice the maximum signal frequency.'
        },
        {
          q: 'How many bits per symbol are transmitted in a 16-QAM modulation scheme?',
          options: ['4 bits/symbol', '2 bits/symbol', '8 bits/symbol', '16 bits/symbol'],
          correct: 0,
          exp: '16-QAM transmits log2(16) = 4 bits per constellation symbol.'
        },
        {
          q: 'What filter maximizes the output signal-to-noise ratio (SNR) in the presence of additive white Gaussian noise?',
          options: ['Matched Filter', 'Butterworth Filter', 'Chebyshev Filter', 'Wiener Filter'],
          correct: 0,
          exp: 'A matched filter is the optimal linear filter maximizing peak SNR in AWGN.'
        },
        {
          q: 'What type of noise is introduced when continuous analog amplitudes are rounded to discrete levels in PCM?',
          options: ['Quantization Noise', 'Thermal Noise', 'Shot Noise', 'Flicker Noise'],
          correct: 0,
          exp: 'Quantization error arises from rounding continuous sample values to the nearest quantization level.'
        },
        {
          q: 'What line coding scheme uses positive, zero, and negative voltage pulses to eliminate DC baseline wander?',
          options: ['Bipolar AMI (Alternate Mark Inversion)', 'Unipolar NRZ', 'Manchester Encoding', 'NRZ-L'],
          correct: 0,
          exp: 'Bipolar AMI alternates positive and negative polarities for successive binary 1s.'
        },
        {
          q: 'What is the theoretical Shannon channel capacity formula for a bandwidth B and signal-to-noise ratio S/N?',
          options: ['C = B * log2(1 + S/N)', 'C = 2B * log2(S/N)', 'C = B * (S/N)', 'C = log2(1 + B*S/N)'],
          correct: 0,
          exp: 'The Shannon-Hartley theorem states C = B * log2(1 + SNR).'
        },
        {
          q: 'In QPSK (Quadrature Phase Shift Keying), what is the phase difference between adjacent constellation points?',
          options: ['90° (π/2 radians)', '180°', '45°', '60°'],
          correct: 0,
          exp: 'QPSK has 4 symbols spaced 90 degrees apart in the I-Q plane.'
        },
        {
          q: 'What error-correcting code adds parity check bits calculated using generator matrices and syndrome decoding?',
          options: ['Linear Block Codes', 'Huffman Code', 'Run-length Code', 'Morse Code'],
          correct: 0,
          exp: 'Linear block codes map message vectors to codewords via a generator matrix G.'
        },
        {
          q: 'What phenomenon causes overlapping of successive pulses due to dispersive channel bandlimiting?',
          options: ['Intersymbol Interference (ISI)', 'Phase Jitter', 'Cross-talk', 'Doppler Spread'],
          correct: 0,
          exp: 'ISI occurs when adjacent transmitted pulses spread out and interfere with one another.'
        },
        {
          q: 'What pulse shape satisfies the Nyquist criterion for zero Intersymbol Interference?',
          options: ['Raised Cosine Pulse', 'Gaussian Pulse', 'Rectangular Pulse', 'Triangular Pulse'],
          correct: 0,
          exp: 'Raised cosine filters provide zero ISI at uniform symbol sampling instances.'
        }
      ]
    },
    {
      id: 'quiz-ec-s6-01',
      title: 'VLSI System Design & CMOS Technology',
      description: 'Assessment on CMOS inverter VTC, stick diagrams, propagation delay, dynamic power dissipation, and FPGA architectures.',
      dept: 'EC',
      dept_id: 'dept-ec',
      sem: 6,
      batch_id: 'batch-ec-s6',
      subject_id: 'sub-ec601',
      subject_code: 'EC601',
      time_limit: 25,
      total_marks: 50,
      pass_percentage: 60,
      status: 'published',
      available_from: '2026-09-01T09:00:00Z',
      available_until: '2026-12-31T23:59:59Z',
      questions: [
        {
          q: 'What formula gives dynamic switching power dissipation in a digital CMOS logic gate?',
          options: ['P = C_L * V_dd^2 * f', 'P = I_static * V_dd', 'P = C_L * V_dd * f', 'P = V_dd^2 / R'],
          correct: 0,
          exp: 'Dynamic power P_dyn is proportional to load capacitance, frequency, and square of supply voltage.'
        },
        {
          q: 'In a standard static CMOS inverter, which transistor pulls the output node HIGH to Vdd?',
          options: ['PMOS transistor in pull-up network', 'NMOS transistor in pull-down network', 'Pass transistor', 'Transmission gate'],
          correct: 0,
          exp: 'PMOS transistors conduct when gate input is 0, pulling output up to Vdd.'
        },
        {
          q: 'Why are PMOS transistors sized approximately 2 to 3 times wider than NMOS transistors in CMOS design?',
          options: ['Hole mobility is 2-3x lower than electron mobility in silicon', 'PMOS handles higher voltage', 'To minimize gate capacitance', 'To reduce leakage current'],
          correct: 0,
          exp: 'Electron mobility μ_n is 2-3 times higher than hole mobility μ_p, requiring wider PMOS channels for symmetric drive.'
        },
        {
          q: 'What parasitic effect causes a parasitic thyristor (PNPN) in CMOS to turn on, creating a low-impedance short circuit?',
          options: ['Latch-up', 'Hot Carrier Injection', 'Electromigration', 'Channel Length Modulation'],
          correct: 0,
          exp: 'Latch-up is caused by parasitic bipolar transistors forming a silicon-controlled rectifier between Vdd and GND.'
        },
        {
          q: 'What fabrication rule set specifies scalable minimum geometry dimensions using a parameter λ (lambda)?',
          options: ['Mead-Conway Design Rules', 'Moore Rules', 'Dennard Scaling Rules', 'IEEE 802 Rules'],
          correct: 0,
          exp: 'Mead-Conway lambda-based rules allow linear geometric scaling across CMOS processes.'
        },
        {
          q: 'What is the logical effort of a standard static CMOS inverter?',
          options: ['1', '4/3', '5/3', '2'],
          correct: 0,
          exp: 'By convention, a standard CMOS inverter is defined to have a logical effort g = 1.'
        },
        {
          q: 'What timing parameter defines the minimum time data must remain stable before the active clock edge?',
          options: ['Setup Time (t_setup)', 'Hold Time (t_hold)', 'Clock-to-Q Delay', 'Contamination Delay'],
          correct: 0,
          exp: 'Setup time is the required stable duration before the clock edge to avoid metastability.'
        },
        {
          q: 'What hardware element in FPGAs implements arbitrary n-input Boolean logic functions?',
          options: ['Look-Up Table (LUT)', 'Multiplier block', 'Carry chain', 'I/O Pad'],
          correct: 0,
          exp: 'SRAM-based Look-Up Tables (LUTs) implement truth tables for custom combinational logic.'
        },
        {
          q: 'What short-channel effect causes threshold voltage to decrease as channel length decreases?',
          options: ['Drain-Induced Barrier Lowering (DIBL)', 'Velocity Saturation', 'Body Effect', 'Subthreshold Slope'],
          correct: 0,
          exp: 'DIBL occurs when drain depletion region reduces the source-channel potential barrier.'
        },
        {
          q: 'In stick diagrams, what standard color represents polysilicon gate material?',
          options: ['Red', 'Green', 'Blue', 'Yellow'],
          correct: 0,
          exp: 'Polysilicon is universally represented by red lines in VLSI stick diagrams.'
        }
      ]
    },

    // ----------------------------------------------------
    // MECHANICAL ENGINEERING (ME)
    // ----------------------------------------------------
    {
      id: 'quiz-me-s1-01',
      title: 'Engineering Mechanics Fundamentals',
      description: 'Assessment on statics, Lami’s theorem, friction coefficients, centroid, and moment of inertia.',
      dept: 'ME',
      dept_id: 'dept-me',
      sem: 1,
      batch_id: 'batch-me-s1',
      subject_id: 'sub-me101',
      subject_code: 'ME101',
      time_limit: 20,
      total_marks: 50,
      pass_percentage: 60,
      status: 'published',
      available_from: '2026-09-01T09:00:00Z',
      available_until: '2026-12-31T23:59:59Z',
      questions: [
        {
          q: 'What theorem states that if three coplanar concurrent forces keep a body in equilibrium, each force is proportional to the sine of the angle between the other two forces?',
          options: ["Lami's Theorem", "Varignon's Theorem", "Newton's Third Law", "Hooke's Law"],
          correct: 0,
          exp: "Lami's theorem relates three coplanar, concurrent equilibrium forces using sine ratios."
        },
        {
          q: 'What is the relationship between the coefficient of static friction (μ_s) and the angle of friction (θ)?',
          options: ['μ_s = tan(θ)', 'μ_s = sin(θ)', 'μ_s = cos(θ)', 'μ_s = cot(θ)'],
          correct: 0,
          exp: 'The coefficient of friction equals the tangent of the angle of friction.'
        },
        {
          q: 'Where is the centroid of a right-angled triangle with base b and height h located from its base?',
          options: ['h / 3', 'h / 2', '2h / 3', 'h / 4'],
          correct: 0,
          exp: 'The centroid of a right triangle is at one-third height from the base.'
        },
        {
          q: 'What is the moment of inertia of a solid circular cross-section of diameter d about its centroidal axis?',
          options: ['(π * d^4) / 64', '(π * d^4) / 32', '(π * d^3) / 12', '(π * d^2) / 4'],
          correct: 0,
          exp: 'For a solid circle, I_xx = (π * d^4) / 64.'
        },
        {
          q: 'According to Newton’s second law of motion, what is net force equal to for a system with constant mass?',
          options: ['Mass * Acceleration (m * a)', 'Mass / Acceleration', 'Momentum * Time', 'Work / Displacement'],
          correct: 0,
          exp: 'F = m * a where mass is constant.'
        },
        {
          q: 'What theorem allows the calculation of moment of inertia about any parallel axis separated by distance d?',
          options: ['Parallel Axis Theorem', 'Perpendicular Axis Theorem', 'Varignon Theorem', 'Euler Theorem'],
          correct: 0,
          exp: 'Parallel Axis Theorem states I = I_G + m * d^2.'
        },
        {
          q: 'What is the SI unit of torque or moment of a force?',
          options: ['Newton-meter (N·m)', 'Joule per second', 'Pascal', 'Newton per meter'],
          correct: 0,
          exp: 'Torque is the cross product of position vector and force, measured in N·m.'
        },
        {
          q: 'What is a truss structure called if the number of members m and joints j satisfy m = 2j - 3?',
          options: ['Perfect Truss (Statically Determinate)', 'Deficient Truss', 'Redundant Truss', 'Unstable Truss'],
          correct: 0,
          exp: 'm = 2j - 3 is the determinacy condition for a stable, statically determinate planar truss.'
        },
        {
          q: 'What is the work done on a body when the displacement is perpendicular to the applied force vector?',
          options: ['Zero (0)', 'Maximum positive work', 'Negative work', 'Infinite'],
          correct: 0,
          exp: 'Work W = F * d * cos(90°) = 0.'
        },
        {
          q: 'What type of collision conserves both linear momentum and total kinetic energy?',
          options: ['Elastic Collision', 'Inelastic Collision', 'Completely Plastic Collision', 'Explosive Collision'],
          correct: 0,
          exp: 'In an elastic collision, total kinetic energy and linear momentum are conserved.'
        }
      ]
    },
    {
      id: 'quiz-me-s4-01',
      title: 'Thermodynamics & Fluid Mechanics Assessment',
      description: 'Midterm assessment on First & Second Laws of Thermodynamics, Carnot efficiency, Bernoulli equation, and Reynolds numbers.',
      dept: 'ME',
      dept_id: 'dept-me',
      sem: 4,
      batch_id: 'batch-me-s4',
      subject_id: 'sub-me402',
      subject_code: 'ME402',
      time_limit: 25,
      total_marks: 50,
      pass_percentage: 60,
      status: 'published',
      available_from: '2026-09-01T09:00:00Z',
      available_until: '2026-12-31T23:59:59Z',
      questions: [
        {
          q: 'Which law of thermodynamics defines the concept of temperature and provides the basis for thermometry?',
          options: ['Zeroth Law of Thermodynamics', 'First Law of Thermodynamics', 'Second Law of Thermodynamics', 'Third Law of Thermodynamics'],
          correct: 0,
          exp: 'The Zeroth law establishes thermal equilibrium transitivity.'
        },
        {
          q: 'What is the theoretical maximum thermal efficiency of a Carnot heat engine operating between temperatures T_H and T_L?',
          options: ['1 - (T_L / T_H)', '(T_H / T_L) - 1', 'T_L / T_H', '1 - (T_H / T_L)'],
          correct: 0,
          exp: 'Carnot efficiency η = 1 - (T_L / T_H), where temperatures are in Kelvin.'
        },
        {
          q: 'In fluid mechanics, which dimensionless number characterizes the ratio of inertial forces to viscous forces?',
          options: ['Reynolds Number (Re)', 'Mach Number (Ma)', 'Froude Number (Fr)', 'Prandtl Number (Pr)'],
          correct: 0,
          exp: 'Reynolds Number Re = (ρ * v * D) / μ determines laminar vs turbulent flow regimes.'
        },
        {
          q: 'Bernoulli’s equation for steady incompressible frictionless flow expresses the conservation of:',
          options: ['Mechanical Energy', 'Mass', 'Momentum', 'Entropy'],
          correct: 0,
          exp: 'Bernoulli’s equation relates pressure, kinetic, and potential energy heads along a streamline.'
        },
        {
          q: 'What thermodynamic process takes place at constant pressure?',
          options: ['Isobaric Process', 'Isochoric Process', 'Isothermal Process', 'Adiabatic Process'],
          correct: 0,
          exp: 'Isobaric signifies constant pressure (dP = 0).'
        },
        {
          q: 'What property of a thermodynamic system remains constant during a reversible adiabatic process?',
          options: ['Entropy', 'Temperature', 'Enthalpy', 'Internal Energy'],
          correct: 0,
          exp: 'A reversible adiabatic process is isentropic (dS = 0).'
        },
        {
          q: 'What device measures the stagnation pressure to calculate flow velocity of a fluid in pipe or flight?',
          options: ['Pitot Tube', 'Manometer', 'Venturi meter', 'Orifice plate'],
          correct: 0,
          exp: 'Pitot tubes measure total pressure, yielding dynamic pressure and fluid speed.'
        },
        {
          q: 'What is the critical Reynolds number for transition from laminar to turbulent flow in a circular pipe?',
          options: ['Approximately 2300', '100', '500,000', '10,000'],
          correct: 0,
          exp: 'Internal pipe flow transitions to turbulent above Re ≈ 2300.'
        },
        {
          q: 'What is the SI unit of dynamic viscosity (μ)?',
          options: ['Pascal-second (Pa·s) or N·s/m^2', 'm^2/s', 'Newton per meter', 'Poiseuille squared'],
          correct: 0,
          exp: 'Dynamic viscosity is measured in Pascal-seconds (Pa·s).'
        },
        {
          q: 'According to the Kelvin-Planck statement of the Second Law of Thermodynamics, it is impossible to construct a device that:',
          options: ['Produces net work while exchanging heat with a single thermal reservoir', 'Transfers heat from cold to hot without work', 'Achieves absolute zero temperature', 'Creates energy from nothing'],
          correct: 0,
          exp: 'Kelvin-Planck states that a 100% efficient heat engine operating on a single reservoir is impossible.'
        }
      ]
    },
    {
      id: 'quiz-me-s2-01',
      title: 'Engineering Graphics & CAD Modeling',
      description: 'Assessment on orthographic projection, first vs third angle, sectional views, isometric projection, and CAD wireframing.',
      dept: 'ME',
      dept_id: 'dept-me',
      sem: 2,
      batch_id: 'batch-me-s2',
      subject_id: 'sub-me201',
      subject_code: 'ME201',
      time_limit: 20,
      total_marks: 50,
      pass_percentage: 60,
      status: 'published',
      available_from: '2026-09-01T09:00:00Z',
      available_until: '2026-12-31T23:59:59Z',
      questions: [
        {
          q: 'In First Angle Projection, where is the Top View positioned relative to the Front View?',
          options: ['Below the Front View', 'Above the Front View', 'To the right of Front View', 'Coincident with Front View'],
          correct: 0,
          exp: 'In first angle projection, the top view is projected onto the bottom horizontal plane below the front view.'
        },
        {
          q: 'What is the angle between the three principal isometric axes in isometric projection?',
          options: ['120°', '90°', '60°', '45°'],
          correct: 0,
          exp: 'In isometric projection, all three principal coordinate axes are inclined at 120 degrees to each other.'
        },
        {
          q: 'What ratio describes isometric length to true true length (isometric scale factor)?',
          options: ['√(2/3) ≈ 0.816', '1.0', '0.5', '1.414'],
          correct: 0,
          exp: 'Isometric scale foreshortens true dimensions by cos(30°)/cos(45°) * (1/√2) = √(2/3) ≈ 0.816.'
        },
        {
          q: 'What line type is standardized in technical engineering drawings to represent hidden edges and contours?',
          options: ['Dashed thin line', 'Continuous thick line', 'Chain thin line with long and short dashes', 'Zigzag line'],
          correct: 0,
          exp: 'Dashed thin lines denote hidden features, surfaces, and outlines.'
        },
        {
          q: 'What type of section view shows an object with one quarter cut away to reveal internal features?',
          options: ['Half Section', 'Full Section', 'Offset Section', 'Revolved Section'],
          correct: 0,
          exp: 'A half section passes cutting planes halfway through, exposing one half of internal details.'
        },
        {
          q: 'In CAD software, what geometric constraint forces two circles to share the exact same center point?',
          options: ['Concentric Constraint', 'Coincident Constraint', 'Tangential Constraint', 'Collinear Constraint'],
          correct: 0,
          exp: 'Concentric constraints lock arcs or circles to a shared center coordinate.'
        },
        {
          q: 'What 3D CAD modeling operation creates a solid by sweeping an open or closed 2D profile along a guide path?',
          options: ['Sweep / Loft', 'Extrude', 'Fillet', 'Chamfer'],
          correct: 0,
          exp: 'Sweeping translates a 2D cross-section profile along a specified trajectory spine.'
        },
        {
          q: 'What curve is traced by a point on the circumference of a circle rolling without slipping along a straight line?',
          options: ['Cycloid', 'Epicycloid', 'Involute', 'Hypocycloid'],
          correct: 0,
          exp: 'A cycloid is generated by rolling a generating circle along a straight directing line.'
        },
        {
          q: 'What standard hatching angle is used for sectional views on engineering drawings?',
          options: ['45°', '30°', '90°', '60°'],
          correct: 0,
          exp: 'Section lines are traditionally drawn as thin continuous parallel lines at 45 degrees.'
        },
        {
          q: 'What projection plane is perpendicular to both the horizontal and vertical projection planes?',
          options: ['Profile Plane (Auxiliary Plane)', 'Ground Plane', 'Picture Plane', 'Frontal Plane'],
          correct: 0,
          exp: 'The Profile Plane is perpendicular to both reference planes and displays side views.'
        }
      ]
    },
    {
      id: 'quiz-me-s3-01',
      title: 'Thermodynamics & Heat Transfer Principles',
      description: 'Assessment on conduction Fourier Law, convection Newton cooling, radiation Stefan-Boltzmann, and heat exchangers.',
      dept: 'ME',
      dept_id: 'dept-me',
      sem: 3,
      batch_id: 'batch-me-s3',
      subject_id: 'sub-me301',
      subject_code: 'ME301',
      time_limit: 25,
      total_marks: 50,
      pass_percentage: 60,
      status: 'published',
      available_from: '2026-09-01T09:00:00Z',
      available_until: '2026-12-31T23:59:59Z',
      questions: [
        {
          q: 'Which law states that the rate of heat conduction through a material is proportional to the negative temperature gradient?',
          options: ["Fourier's Law of Heat Conduction", "Newton's Law of Cooling", "Stefan-Boltzmann Law", "Wien's Displacement Law"],
          correct: 0,
          exp: "Fourier's Law states Q = -k * A * (dT/dx)."
        },
        {
          q: 'According to the Stefan-Boltzmann law, the total emissive power of a blackbody is proportional to what power of absolute temperature?',
          options: ['T^4', 'T^2', 'T^3', 'T'],
          correct: 0,
          exp: 'Emissive power E_b = σ * T^4 where σ is the Stefan-Boltzmann constant.'
        },
        {
          q: 'Which dimensionless number represents the ratio of convective to conductive heat transfer across a fluid boundary?',
          options: ['Nusselt Number (Nu)', 'Prandtl Number (Pr)', 'Grashof Number (Gr)', 'Biot Number (Bi)'],
          correct: 0,
          exp: 'Nusselt number Nu = (h * L) / k measures the enhancement of heat transfer by convection.'
        },
        {
          q: 'What is thermal diffusivity defined as in transient heat conduction?',
          options: ['α = k / (ρ * c_p)', 'α = k * ρ * c_p', 'α = h / k', 'α = μ * c_p / k'],
          correct: 0,
          exp: 'Thermal diffusivity α = k / (ρ * c_p) represents the rate of heat diffusion through a medium.'
        },
        {
          q: 'What device enhances heat transfer from a surface to surrounding fluid by increasing effective surface area?',
          options: ['Fins (Extended Surfaces)', 'Insulation jacket', 'Nozzle', 'Turbine'],
          correct: 0,
          exp: 'Fins are extended conductive surfaces engineered to augment convective heat dissipation.'
        },
        {
          q: 'In counter-flow heat exchangers compared to parallel-flow heat exchangers for identical inlet/outlet temperatures, the LMTD is:',
          options: ['Always higher in counter-flow', 'Always lower in counter-flow', 'Identical', 'Zero'],
          correct: 0,
          exp: 'Counter-flow provides a higher Log Mean Temperature Difference (LMTD) and superior heat transfer efficiency.'
        },
        {
          q: 'What dimensionless number indicates whether temperature gradients inside a solid are negligible during transient heating/cooling (Bi < 0.1)?',
          options: ['Biot Number (Bi)', 'Fourier Number (Fo)', 'Reynolds Number', 'Stanton Number'],
          correct: 0,
          exp: 'When Biot number Bi = (h * L_c) / k < 0.1, lumped capacitance spatial uniformity can be assumed.'
        },
        {
          q: 'What physical law dictates that the wavelength of maximum radiation emission from a blackbody is inversely proportional to temperature?',
          options: ["Wien's Displacement Law", "Planck's Law", "Kirchhoff's Radiation Law", "Lambert's Cosine Law"],
          correct: 0,
          exp: "Wien's law states λ_max * T = 2898 μm·K."
        },
        {
          q: 'What fluid heat transfer regime occurs strictly due to density differences induced by temperature gradients without external fans or pumps?',
          options: ['Natural / Free Convection', 'Forced Convection', 'Boiling', 'Radiation'],
          correct: 0,
          exp: 'Natural convection is driven entirely by buoyancy forces arising from fluid density differentials.'
        },
        {
          q: 'What is the critical radius of insulation for a circular cylinder with thermal conductivity k and convective coefficient h?',
          options: ['r_cr = k / h', 'r_cr = h / k', 'r_cr = 2k / h', 'r_cr = sqrt(k / h)'],
          correct: 0,
          exp: 'For a cylinder, the critical radius of insulation maximizing heat loss is r_cr = k / h.'
        }
      ]
    },
    {
      id: 'quiz-me-s5-01',
      title: 'Thermal Engineering & Gas Power Cycles',
      description: 'Assessment on Otto, Diesel, Dual, and Brayton gas turbine cycles, compressor stages, and regenerative rankine cycles.',
      dept: 'ME',
      dept_id: 'dept-me',
      sem: 5,
      batch_id: 'batch-me-s5',
      subject_id: 'sub-me501',
      subject_code: 'ME501',
      time_limit: 25,
      total_marks: 50,
      pass_percentage: 60,
      status: 'published',
      available_from: '2026-09-01T09:00:00Z',
      available_until: '2026-12-31T23:59:59Z',
      questions: [
        {
          q: 'What ideal thermodynamic air-standard power cycle represents the working cycle of a spark-ignition (petrol) engine?',
          options: ['Otto Cycle', 'Diesel Cycle', 'Brayton Cycle', 'Rankine Cycle'],
          correct: 0,
          exp: 'The Otto cycle features constant-volume heat addition and heat rejection.'
        },
        {
          q: 'In a Diesel cycle, how is heat added to the working fluid?',
          options: ['At constant pressure', 'At constant volume', 'Isothermally', 'Isentropically'],
          correct: 0,
          exp: 'The ideal Diesel cycle assumes constant-pressure heat addition.'
        },
        {
          q: 'What ideal thermodynamic gas power cycle serves as the model for modern aircraft jet engines and gas turbine power plants?',
          options: ['Brayton Cycle', 'Carnot Cycle', 'Stirling Cycle', 'Erickson Cycle'],
          correct: 0,
          exp: 'The open/closed Brayton cycle models continuous gas turbine compressors, combustion chambers, and turbines.'
        },
        {
          q: 'For the same compression ratio and heat input, what is the correct ordering of theoretical thermal efficiencies?',
          options: ['η_Otto > η_Dual > η_Diesel', 'η_Diesel > η_Dual > η_Otto', 'η_Otto = η_Diesel', 'η_Dual > η_Otto > η_Diesel'],
          correct: 0,
          exp: 'At the same compression ratio, heat addition at constant volume gives higher thermal efficiency: Otto > Dual > Diesel.'
        },
        {
          q: 'What parameter is defined as the ratio of clearance volume to swept (displacement) volume?',
          options: ['Clearance Ratio (c)', 'Compression Ratio (r)', 'Cut-off Ratio (r_c)', 'Expansion Ratio'],
          correct: 0,
          exp: 'Clearance ratio c = V_c / V_s.'
        },
        {
          q: 'What component in a steam power plant condenses turbine exhaust steam into liquid water at low pressure?',
          options: ['Surface Condenser', 'Economizer', 'Superheater', 'Deaerator'],
          correct: 0,
          exp: 'The condenser condenses exhaust steam, maintaining vacuum conditions to maximize turbine expansion work.'
        },
        {
          q: 'What modification in a Brayton gas turbine cycle uses exhaust gases to preheat compressed air before the combustor?',
          options: ['Regeneration (Recuperation)', 'Intercooling', 'Reheating', 'Afterburning'],
          correct: 0,
          exp: 'Regeneration extracts thermal energy from turbine exhaust to preheat combustor inlet air.'
        },
        {
          q: 'What is the function of an economizer in a high-pressure boiler system?',
          options: ['Preheats boiler feedwater using flue gas heat', 'Preheats combustion air', 'Superheats saturated steam', 'Removes soot from flue gas'],
          correct: 0,
          exp: 'An economizer recovers heat from flue gas to preheat feedwater before it enters the boiler drum.'
        },
        {
          q: 'What ratio compares the actual indicated work of an engine to the fuel energy supplied?',
          options: ['Indicated Thermal Efficiency', 'Brake Thermal Efficiency', 'Mechanical Efficiency', 'Volumetric Efficiency'],
          correct: 0,
          exp: 'Indicated thermal efficiency measures how effectively fuel combustion heat is converted to work inside cylinders.'
        },
        {
          q: 'What device connects multi-stage compressors to reduce air temperature between compression stages toward isothermal work?',
          options: ['Intercooler', 'Aftercooler', 'Regenerator', 'Diffuser'],
          correct: 0,
          exp: 'Intercooling cools gas between compression stages, minimizing total required compressor work.'
        }
      ]
    },
    {
      id: 'quiz-me-s6-01',
      title: 'Robotics and Industrial Automation Assessment',
      description: 'Assessment on Denavit-Hartenberg parameters, forward/inverse kinematics, Jacobian velocity, PID motion, and PLC ladder logic.',
      dept: 'ME',
      dept_id: 'dept-me',
      sem: 6,
      batch_id: 'batch-me-s6',
      subject_id: 'sub-me601',
      subject_code: 'ME601',
      time_limit: 25,
      total_marks: 50,
      pass_percentage: 60,
      status: 'published',
      available_from: '2026-09-01T09:00:00Z',
      available_until: '2026-12-31T23:59:59Z',
      questions: [
        {
          q: 'How many Denavit-Hartenberg (D-H) parameters are required to relate any two consecutive coordinate frames in an open serial kinematic chain?',
          options: ['4 parameters (a, α, d, θ)', '6 parameters', '3 parameters', '8 parameters'],
          correct: 0,
          exp: 'D-H convention uses four parameters: link length (a), link twist (α), link offset (d), and joint angle (θ).'
        },
        {
          q: 'What is the kinematic problem of determining end-effector position and orientation given known joint angles called?',
          options: ['Forward Kinematics', 'Inverse Kinematics', 'Differential Kinematics', 'Dynamics'],
          correct: 0,
          exp: 'Forward kinematics maps joint space angles to Cartesian task space pose.'
        },
        {
          q: 'What mathematical matrix relates joint velocities (q-dot) to Cartesian linear and angular end-effector velocities (x-dot)?',
          options: ['Robotic Jacobian Matrix (J)', 'Inertia Matrix', 'Stiffness Matrix', 'Christoffel Matrix'],
          correct: 0,
          exp: 'The Jacobian matrix J(q) defines the linear mapping between joint velocities and end-effector velocities.'
        },
        {
          q: 'What kinematic condition occurs when the robot Jacobian matrix loses rank (det(J) = 0), causing loss of one or more degrees of freedom?',
          options: ['Kinematic Singularity', 'Gimbal Lock', 'Deadlock', 'Resonance'],
          correct: 0,
          exp: 'At singular configurations, the manipulator loses mobility along one or more directions.'
        },
        {
          q: 'What industrial robot joint configuration is denoted by SCARA?',
          options: ['Selective Compliance Assembly Robot Arm', 'Serial Connected Articulated Robotic Apparatus', 'Standard Cylindrical Automated Robot', 'Synchronous Coordinate Arm'],
          correct: 0,
          exp: 'SCARA robots provide selective compliance in the horizontal XY plane while maintaining vertical Z rigidity.'
        },
        {
          q: 'In Programmable Logic Controllers (PLCs), what graphical programming language uses rungs, contacts, and coils resembling relay schematics?',
          options: ['Ladder Diagram (LD)', 'Structured Text (ST)', 'Function Block Diagram (FBD)', 'Instruction List (IL)'],
          correct: 0,
          exp: 'Ladder Diagram is the most widely adopted IEC 61131-3 graphical programming language in industrial automation.'
        },
        {
          q: 'What sensor provides optical feedback of rotational position and speed by detecting pulse transitions on a slotted disc?',
          options: ['Optical Rotary Encoder', 'LVDT', 'Thermocouple', 'Strain Gauge'],
          correct: 0,
          exp: 'Incremental or absolute optical rotary encoders deliver precise digital angular position feedback.'
        },
        {
          q: 'What term describes the complete geometric volume reachable by the robot end-effector?',
          options: ['Workspace / Work Envelope', 'Dexterous Zone', 'Manipulator Envelope', 'Reach Radius'],
          correct: 0,
          exp: 'The workspace defines the set of all spatial points the end-effector can access.'
        },
        {
          q: 'In PID control systems, what term eliminates steady-state tracking error by accumulating past error over time?',
          options: ['Integral Term (I)', 'Proportional Term (P)', 'Derivative Term (D)', 'Feedforward Gain'],
          correct: 0,
          exp: 'The integral controller continuously sums offset error, driving steady-state error to zero.'
        },
        {
          q: 'What industrial communication protocol standard operates over RS-485 serial communication in Master-Slave architecture?',
          options: ['Modbus RTU', 'Ethernet/IP', 'Profinet', 'MQTT'],
          correct: 0,
          exp: 'Modbus RTU is the industry-standard serial communication protocol over differential RS-485 lines.'
        }
      ]
    }
  ];

  // Wipe and rebuild quizzes, questions, options to guarantee clean state
  data.quizzes = [];
  data.quiz_questions = [];
  data.quiz_options = [];
  // Clean attempts for quizzes not in our new accredited list
  const validQuizIds = new Set(assessmentSpecs.map(a => a.id));
  data.quiz_attempts = (data.quiz_attempts || []).filter(a => validQuizIds.has(a.quiz_id));
  const newQuestionIds = new Set();

  assessmentSpecs.forEach(spec => {
    // 1. Build Quiz Record
    const quizRecord = {
      id: spec.id,
      title: spec.title,
      instructions: spec.description,
      description: spec.description,
      department_code: spec.dept,
      department_id: spec.dept_id,
      semester: spec.sem,
      batch_id: spec.batch_id,
      course_id: spec.subject_id,
      subject_id: spec.subject_id,
      subject_code: spec.subject_code,
      time_limit: spec.time_limit,
      time_limit_minutes: spec.time_limit,
      duration_minutes: spec.time_limit,
      total_marks: spec.total_marks,
      total_points: spec.total_marks,
      pass_percentage: spec.pass_percentage,
      passing_percentage: spec.pass_percentage,
      max_attempts: 10,
      status: spec.status,
      is_published: true,
      available_from: spec.available_from,
      available_until: spec.available_until,
      created_at: '2026-09-01T08:00:00Z',
      updated_at: '2026-10-27T08:00:00Z'
    };
    data.quizzes.push(quizRecord);

    // 2. Build Questions and 4 Options per question
    spec.questions.forEach((qItem, qIdx) => {
      const qId = `qq-${spec.id}-${qIdx + 1}`;
      newQuestionIds.add(qId);

      const questionRecord = {
        id: qId,
        quiz_id: spec.id,
        question_text: qItem.q,
        question_type: 'mcq',
        points: Math.round(spec.total_marks / spec.questions.length),
        marks: Math.round(spec.total_marks / spec.questions.length),
        sort_order: qIdx + 1,
        explanation: qItem.exp
      };
      data.quiz_questions.push(questionRecord);

      // Options
      qItem.options.forEach((optText, optIdx) => {
        const isCorrect = optIdx === qItem.correct;
        const optId = `opt-${qId}-${optIdx + 1}`;
        data.quiz_options.push({
          id: optId,
          question_id: qId,
          option_text: optText,
          is_correct: isCorrect,
          sort_order: optIdx + 1
        });

        if (isCorrect) {
          questionRecord.correct_option_id = optId;
        }
      });
    });
  });

  // Ensure completed test attempt exists for Alex Rivera (user-student-01, CS-S4) on quiz-cs-s4-03
  // So the 'Completed Assessments' tab & 'Retest' button can be verified immediately!
  data.quiz_attempts = (data.quiz_attempts || []).filter(a => a.quiz_id !== 'quiz-cs-s4-03' || a.user_id !== 'user-student-01');
  data.quiz_attempts.push({
    id: 'att-cs403-completed-01',
    quiz_id: 'quiz-cs-s4-03',
    user_id: 'user-student-01',
    enrolment_id: 'enr-cs403-01',
    attempt_number: 1,
    started_at: '2026-10-20T10:00:00Z',
    submitted_at: '2026-10-20T10:22:15Z',
    time_spent_seconds: 1335,
    total_score: 40,
    max_score: 50,
    percentage: 80,
    status: 'completed',
    is_passed: true,
    feedback: 'Good analytical reasoning on algorithmic complexity.',
    created_at: '2026-10-20T10:00:00Z'
  });

  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log(`[Assessments Seed] Completed! Total Quizzes: ${data.quizzes.length}, Questions: ${data.quiz_questions.length}, Options: ${data.quiz_options.length}`);
}

if (require.main === module) {
  generateComprehensiveAssessments();
}

module.exports = { generateComprehensiveAssessments };
