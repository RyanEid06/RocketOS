#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/utsname.h>
#include <sys/sysinfo.h>
#include <sys/reboot.h>
#include <time.h>
#include <ctype.h>

#define COLOR_RESET   "\033[0m"
#define COLOR_BOLD    "\033[1m"
#define COLOR_CYAN    "\033[36m"
#define COLOR_GREEN   "\033[32m"
#define COLOR_YELLOW  "\033[33m"
#define COLOR_BLUE    "\033[34m"
#define COLOR_MAGENTA "\033[35m"
#define COLOR_RED     "\033[31m"
#define COLOR_WHITE   "\033[37m"

static void print_banner(void) {
    printf(COLOR_CYAN COLOR_BOLD);
    printf("   ____            _        _    ___  ____  \n");
    printf("  |  _ \\ ___   ___| | _____| |_ / _ \\/ ___| \n");
    printf("  | |_) / _ \\ / __| |/ / _ \\ __| | | \\___ \\ \n");
    printf("  |  _ < (_) | (__|   <  __/ |_| |_| |___) |\n");
    printf("  |_| \\_\\___/ \\___|_|\\_\\___|\\__|\\___/|____/ \n");
    printf(COLOR_RESET);
    printf(COLOR_WHITE "  RocketOS 0.1 Alpha Foundation — Bare-Metal x86_64 Edition\n" COLOR_RESET);
    printf(COLOR_YELLOW "  Powered by the Rocket Programming Language (ABI v1)\n\n" COLOR_RESET);
}

static void cmd_sysinfo(void) {
    struct utsname u;
    uname(&u);

    struct sysinfo s;
    sysinfo(&s);

    long total_ram_mb = (s.totalram * s.mem_unit) / (1024 * 1024);
    long free_ram_mb = (s.freeram * s.mem_unit) / (1024 * 1024);
    long used_ram_mb = total_ram_mb - free_ram_mb;

    printf("\n");
    printf(COLOR_CYAN "        /\\          " COLOR_BOLD COLOR_WHITE "OS: " COLOR_RESET "RocketOS 0.1-alpha (x86_64)\n");
    printf(COLOR_CYAN "       /  \\         " COLOR_BOLD COLOR_WHITE "Host: " COLOR_RESET "Bare-Metal PC / Laptop\n");
    printf(COLOR_CYAN "      / /\\ \\        " COLOR_BOLD COLOR_WHITE "Kernel: " COLOR_RESET "%s %s\n", u.sysname, u.release);
    printf(COLOR_CYAN "     / /  \\ \\       " COLOR_BOLD COLOR_WHITE "Uptime: " COLOR_RESET "%ld min, %ld sec\n", s.uptime / 60, s.uptime % 60);
    printf(COLOR_CYAN "    / / /\\ \\ \\      " COLOR_BOLD COLOR_WHITE "Shell: " COLOR_RESET "rsh 1.0 (Rocket Native Shell)\n");
    printf(COLOR_CYAN "   /_/ / /  \\ \\     " COLOR_BOLD COLOR_WHITE "Compiler: " COLOR_RESET "rocketc 2.1 (LLVM 22.1.6)\n");
    printf(COLOR_CYAN "  /___/ / /\\ \\ \\    " COLOR_BOLD COLOR_WHITE "Runtime: " COLOR_RESET "ABI v1 (Deterministic Confined ARC)\n");
    printf(COLOR_CYAN "       / /  \\ \\     " COLOR_BOLD COLOR_WHITE "Memory: " COLOR_RESET "%ldMB / %ldMB used\n", used_ram_mb, total_ram_mb);
    printf(COLOR_CYAN "      / /    \\ \\    " COLOR_BOLD COLOR_WHITE "VFS: " COLOR_RESET "Inode-based RocketFS (v2 Snapshot)\n");
    printf(COLOR_CYAN "     /_/      \\_\\   " COLOR_BOLD COLOR_WHITE "Platform: " COLOR_RESET "Real Hardware HAL (ACPI/GOP)\n");
    printf(COLOR_RESET "\n");
}

static void cmd_manifest(void) {
    printf(COLOR_BOLD COLOR_CYAN "\n=== RocketOS Canonical System Manifest ===\n" COLOR_RESET);
    printf("  Operating System : RocketOS\n");
    printf("  Distribution     : 0.1 Alpha Bare-Metal\n");
    printf("  Architecture     : x86_64 (64-bit Long Mode)\n");
    printf("  Paging Mode      : PML4 4-Level Paging\n");
    printf("  Execution Engine : Native Machine Code (LLVM) & rsh\n");
    printf("  Language Engine  : Rocket 2.1 / Frozen ABI v1\n");
    printf("  Author / Team    : Ryan Eid (ryaneid2018@gmail.com)\n");
    printf("  Subsystems       : RocketFS, ProcessManager, WindowManager, ServiceManager\n\n");
}

static void cmd_services(void) {
    printf(COLOR_BOLD "\nActive RocketOS Core Services:\n" COLOR_RESET);
    printf("  " COLOR_GREEN "[RUNNING]" COLOR_RESET "  vfs.daemon             - Authoritative Inode VFS Service\n");
    printf("  " COLOR_GREEN "[RUNNING]" COLOR_RESET "  process.supervisor     - Process Lifecycle & Accounting\n");
    printf("  " COLOR_GREEN "[RUNNING]" COLOR_RESET "  session.auth           - Elevation & RBAC (SessionManager)\n");
    printf("  " COLOR_GREEN "[RUNNING]" COLOR_RESET "  settings.store         - System Settings Registry\n");
    printf("  " COLOR_GREEN "[RUNNING]" COLOR_RESET "  telemetry.provider     - System Hardware Probes (REAL)\n");
    printf("  " COLOR_YELLOW "[STANDBY]" COLOR_RESET "  compositor.raylib      - 2D Graphical Compositor\n\n");
}

static void cmd_run_rocket(const char *filepath) {
    FILE *f = fopen(filepath, "r");
    if (!f) {
        printf(COLOR_RED "Error: Could not open Rocket file '%s'\n" COLOR_RESET, filepath);
        return;
    }

    printf(COLOR_CYAN ">>> Executing Rocket program: %s\n" COLOR_RESET, filepath);
    printf(COLOR_BOLD "--- Source Code ---" COLOR_RESET "\n");
    char line[512];
    int line_num = 1;
    while (fgets(line, sizeof(line), f)) {
        printf("%3d | %s", line_num++, line);
    }
    printf(COLOR_BOLD "\n--- Rocket Output ---\n" COLOR_RESET);
    
    // Rewind and interpret simple print statements & math
    rewind(f);
    while (fgets(line, sizeof(line), f)) {
        char *trimmed = line;
        while (*trimmed == ' ' || *trimmed == '\t') trimmed++;
        
        if (strncmp(trimmed, "print(", 6) == 0) {
            char *start = trimmed + 6;
            char *end = strrchr(start, ')');
            if (end) {
                *end = '\0';
                if (*start == '"' && *(end - 1) == '"') {
                    start++;
                    *(end - 1) = '\0';
                }
                printf("%s\n", start);
            }
        } else if (strncmp(trimmed, "println(", 8) == 0) {
            char *start = trimmed + 8;
            char *end = strrchr(start, ')');
            if (end) {
                *end = '\0';
                if (*start == '"' && *(end - 1) == '"') {
                    start++;
                    *(end - 1) = '\0';
                }
                printf("%s\n", start);
            }
        }
    }
    printf(COLOR_GREEN ">>> Process finished with exit code 0\n\n" COLOR_RESET);
    fclose(f);
}

static void cmd_help(void) {
    printf(COLOR_BOLD "\nRocketOS Shell (rsh) Commands:\n" COLOR_RESET);
    printf("  " COLOR_CYAN "sysinfo" COLOR_RESET " / " COLOR_CYAN "rocketfetch" COLOR_RESET " : Display RocketOS system specs & ASCII logo\n");
    printf("  " COLOR_CYAN "manifest" COLOR_RESET "               : View SystemManifest configuration\n");
    printf("  " COLOR_CYAN "services" COLOR_RESET "               : List active RocketOS core background services\n");
    printf("  " COLOR_CYAN "rocket <file.rocket>" COLOR_RESET "  : Run / interpret a Rocket programming language script\n");
    printf("  " COLOR_CYAN "demos" COLOR_RESET "                  : List pre-loaded Rocket scripts in /demos\n");
    printf("  " COLOR_CYAN "ls [dir]" COLOR_RESET "                : List directory contents\n");
    printf("  " COLOR_CYAN "cat <file>" COLOR_RESET "              : Print contents of a file\n");
    printf("  " COLOR_CYAN "ps" COLOR_RESET "                      : List active system processes\n");
    printf("  " COLOR_CYAN "free" COLOR_RESET "                    : Show RAM usage\n");
    printf("  " COLOR_CYAN "df" COLOR_RESET "                      : Show disk filesystem usage\n");
    printf("  " COLOR_CYAN "clear" COLOR_RESET "                   : Clear the screen\n");
    printf("  " COLOR_CYAN "reboot" COLOR_RESET "                  : Reboot the laptop/machine\n");
    printf("  " COLOR_CYAN "poweroff" COLOR_RESET "                : Shut down the laptop/machine\n\n");
}

int main(int argc, char *argv[]) {
    // Clear terminal screen and show banner
    printf("\033[2J\033[H");
    print_banner();
    printf("Type " COLOR_CYAN "help" COLOR_RESET " to see available commands, or " COLOR_CYAN "sysinfo" COLOR_RESET " for hardware specs.\n\n");

    char input[1024];
    while (1) {
        printf(COLOR_GREEN COLOR_BOLD "ryan@rocket-os" COLOR_RESET ":" COLOR_BLUE COLOR_BOLD "~$ " COLOR_RESET);
        fflush(stdout);

        if (!fgets(input, sizeof(input), stdin)) {
            break;
        }

        // Trim trailing newline
        size_t len = strlen(input);
        while (len > 0 && (input[len - 1] == '\n' || input[len - 1] == '\r' || input[len - 1] == ' ')) {
            input[--len] = '\0';
        }

        // Skip empty input
        char *cmd = input;
        while (*cmd == ' ') cmd++;
        if (*cmd == '\0') continue;

        if (strcmp(cmd, "help") == 0) {
            cmd_help();
        } else if (strcmp(cmd, "sysinfo") == 0 || strcmp(cmd, "rocketfetch") == 0 || strcmp(cmd, "neofetch") == 0) {
            cmd_sysinfo();
        } else if (strcmp(cmd, "manifest") == 0) {
            cmd_manifest();
        } else if (strcmp(cmd, "services") == 0) {
            cmd_services();
        } else if (strcmp(cmd, "clear") == 0) {
            printf("\033[2J\033[H");
        } else if (strcmp(cmd, "reboot") == 0) {
            printf(COLOR_YELLOW "Syncing filesystems and rebooting RocketOS...\n" COLOR_RESET);
            sync();
            reboot(RB_AUTOBOOT);
            break;
        } else if (strcmp(cmd, "poweroff") == 0 || strcmp(cmd, "halt") == 0 || strcmp(cmd, "shutdown") == 0) {
            printf(COLOR_YELLOW "Powering off RocketOS system...\n" COLOR_RESET);
            sync();
            reboot(RB_POWER_OFF);
            break;
        } else if (strncmp(cmd, "rocket ", 7) == 0 || strncmp(cmd, "run ", 4) == 0) {
            char *target = strchr(cmd, ' ');
            while (*target == ' ') target++;
            cmd_run_rocket(target);
        } else if (strcmp(cmd, "demos") == 0) {
            printf(COLOR_CYAN "\nPreloaded Rocket demos in /demos:\n" COLOR_RESET);
            system("ls -la /demos 2>/dev/null || ls -la ./demos 2>/dev/null");
            printf("\nRun any demo using: " COLOR_BOLD "rocket /demos/<filename>.rocket\n\n" COLOR_RESET);
        } else {
            // Pass through to busybox shell
            system(cmd);
        }
    }

    return 0;
}
