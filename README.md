# Banking and ATM Transaction Processing System – OS Algorithm Visualizer

## Overview
This project models a banking system that handles ATM withdrawals, cash deposits, fund transfers, balance inquiries, and transaction-record updates. The application demonstrates CPU scheduling, producer-consumer synchronization, Banker's Algorithm, and memory management for transaction processing.

## Run
From this folder, install the requirements once, then start the local server:

```powershell
python -m pip install -r requirements.txt
python app.py
```

For later runs, only use `python app.py`. Stop the server with Ctrl+C in the terminal where it is running.
Then open http://127.0.0.1:5000 in a browser. The Flask server serves the frontend and its CSS/JavaScript files, as well as the API. You can also open `index.html` directly for the frontend-only visualizer.

## Module behavior
1. CPU Scheduling: FCFS, SJF, SRTF, Round Robin, and Non-preemptive or Preemptive Priority
2. Producer-Consumer: bounded transaction queue with full/empty handling
3. Banker's Algorithm: safe and unsafe resource states using allocation, maximum, available, and need matrices
4. Memory Management: First Fit and Best Fit allocation for memory blocks
5. OS Concepts Lab: interactive demonstrations of synchronization, process states, deadlock detection, page replacement, disk scheduling, file allocation, and threads

## Sample expectations
- FCFS example: completion time, waiting time, turnaround time, and averages are calculated automatically.
- Transaction queue blocks when full and stops when empty.
- Banker's safe example results in a valid safe sequence.
- Unsafe example shows a deadlock-risk state.
- Memory examples show successful or failed allocation clearly.

## Test the CPU scheduler
1. Open the CPU Scheduling module, then click **Load sample** or add processes with unique IDs and whole-number arrival, burst, and priority values.
2. Select FCFS, SJF, SRTF, Round Robin, or Priority Scheduling. Priority supports both non-preemptive and preemptive modes; a smaller priority number means higher priority. For Round Robin, enter a whole-number time quantum of at least 1.
3. Click **Run simulation**. The Gantt chart shows every execution interval, including idle time and preemptions. The results table reports completion, turnaround, waiting, and response times.
4. Review the metric cards for average waiting, turnaround, and response time, CPU utilization, and throughput. Use **Compare algorithms** to run every algorithm against the same workload.
5. Use **Start**, **Pause**, **Resume**, and **Next step** to inspect the calculated execution trace. These controls advance the actual Gantt segments; they do not simulate a separate schedule.
6. Use **Edit** or **Remove** for an individual process, or **Reset** to clear the process list and results. Adding, editing, removing, and resetting invalidate previous results.

## OS Concepts Lab

Open **OS Concepts Lab** from the sidebar or dashboard. The lab contains seven educational simulators:

- **Synchronization** demonstrates a controlled race condition and mutex-protected critical sections.
- **Process states** shows New, Ready, Running, Waiting, and Terminated transitions for fictional banking processes.
- **Deadlock detection** accepts Available, Allocation, and Request matrices and identifies blocked processes using the multiple-instance detection algorithm.
- **Page replacement** compares FIFO, LRU, and Optimal using a reference string and frame count.
- **Disk scheduling** compares FCFS, SSTF, SCAN, and C-SCAN using cylinder requests, head position, range, and direction.
- **File allocation** illustrates contiguous, linked, and indexed allocation for fictional transaction logs without changing real files.
- **Threads** shows a visual timeline for validation, logging, and notification tasks. It does not create operating-system threads.

All results are calculated in the browser from the inputs. The deadlock explanation intentionally distinguishes multiple-instance detection from the single-instance resource-graph cycle rule, and the disk module explains that SSD behavior differs from mechanical disks.
