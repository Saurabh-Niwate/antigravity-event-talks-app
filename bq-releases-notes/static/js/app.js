/**
 * BigQuery Release Notes Explorer
 * Vanilla JavaScript application logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // App State
    let rawReleases = [];
    let parsedReleases = [];
    
    const state = {
        filterType: 'all',
        searchQuery: '',
        sortBy: 'newest'
    };

    // DOM Elements
    const elements = {
        themeToggle: document.getElementById('theme-toggle'),
        refreshBtn: document.getElementById('refresh-btn'),
        refreshIcon: document.querySelector('#refresh-btn .icon-refresh'),
        searchInput: document.getElementById('search-input'),
        clearSearchBtn: document.getElementById('clear-search'),
        filterPills: document.getElementById('filter-pills'),
        sortSelect: document.getElementById('sort-select'),
        
        // Stats
        statEntries: document.getElementById('stat-entries'),
        statFeatures: document.getElementById('stat-features'),
        statDeprecations: document.getElementById('stat-deprecations'),
        statIssues: document.getElementById('stat-issues'),
        
        // Page States
        loadingState: document.getElementById('loading-state'),
        errorState: document.getElementById('error-state'),
        errorMessage: document.getElementById('error-message'),
        emptyState: document.getElementById('empty-state'),
        timelineContainer: document.getElementById('timeline-container'),
        
        // Buttons
        retryBtn: document.getElementById('retry-btn'),
        resetFiltersBtn: document.getElementById('reset-filters-btn'),
        backToTop: document.getElementById('back-to-top'),
        exportCsvBtn: document.getElementById('export-csv-btn')
    };

    // Initialize Icons
    lucide.createIcons();

    /* ==========================================
       THEME MANAGEMENT
       ========================================== */
    const initTheme = () => {
        const savedTheme = localStorage.getItem('bq-notes-theme');
        if (savedTheme) {
            document.body.className = savedTheme;
        } else {
            // Default to dark theme, or match system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.className = prefersDark ? 'dark-theme' : 'light-theme';
        }
        updateThemeToggleIcon();
    };

    const toggleTheme = () => {
        if (document.body.classList.contains('dark-theme')) {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            localStorage.setItem('bq-notes-theme', 'light-theme');
        } else {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            localStorage.setItem('bq-notes-theme', 'dark-theme');
        }
        updateThemeToggleIcon();
    };

    const updateThemeToggleIcon = () => {
        if (elements.themeToggle) {
            elements.themeToggle.checked = document.body.classList.contains('light-theme');
        }
        // Lucide icons will be recreated automatically
        lucide.createIcons();
    };

    elements.themeToggle.addEventListener('change', toggleTheme);

    /* ==========================================
       TOAST NOTIFICATIONS
       ========================================== */
    const showToast = (message, type = 'success') => {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconName = type === 'success' ? 'check-circle' : 'alert-circle';
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i data-lucide="${iconName}"></i>
            </div>
            <div class="toast-message">${message}</div>
        `;
        
        toastContainer.appendChild(toast);
        lucide.createIcons();
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse forwards';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    };

    /* ==========================================
       FEED FETCHING & PARSING
       ========================================== */
    const normalizeType = (typeLabel) => {
        const label = typeLabel.toLowerCase();
        if (label.includes('feature')) return 'feature';
        if (label.includes('issue') || label.includes('bug') || label.includes('broken')) return 'issue';
        if (label.includes('deprecation') || label.includes('deprecated')) return 'deprecation';
        if (label.includes('change') || label.includes('update')) return 'change';
        if (label.includes('notice') || label.includes('announcement') || label.includes('attention') || label.includes('important')) return 'notice';
        if (label.includes('beta') || label.includes('preview')) return 'notice';
        return 'change';
    };

    const parseRawReleases = (releases) => {
        const parser = new DOMParser();
        
        return releases.map(entry => {
            const doc = parser.parseFromString(entry.content, 'text/html');
            const h3Headers = doc.querySelectorAll('h3');
            const notes = [];
            
            if (h3Headers.length === 0) {
                // If there's no structured H3 tags, treat the whole content as one Notice
                const plainText = doc.body.textContent || '';
                notes.push({
                    type: 'notice',
                    typeLabel: 'Notice',
                    content: entry.content,
                    plainText: plainText.toLowerCase(),
                    id: `${entry.id}-default`
                });
            } else {
                h3Headers.forEach((header, index) => {
                    const typeLabel = header.textContent.trim();
                    const type = normalizeType(typeLabel);
                    
                    // Accumulate all elements following this H3 until the next H3
                    let currentSibling = header.nextElementSibling;
                    let noteContent = '';
                    let plainTextParts = [];
                    
                    while (currentSibling && currentSibling.tagName !== 'H3') {
                        noteContent += currentSibling.outerHTML;
                        plainTextParts.push(currentSibling.textContent);
                        currentSibling = currentSibling.nextElementSibling;
                    }
                    
                    notes.push({
                        type: type,
                        typeLabel: typeLabel,
                        content: noteContent || '<p>No details provided.</p>',
                        plainText: plainTextParts.join(' ').toLowerCase(),
                        id: `${entry.id}-${index}`
                    });
                });
            }
            
            return {
                id: entry.id,
                title: entry.title,
                updated: entry.updated,
                notes: notes
            };
        });
    };

    const fetchFeed = async () => {
        // Show loading state
        elements.loadingState.style.display = 'block';
        elements.timelineContainer.style.display = 'none';
        elements.errorState.style.display = 'none';
        elements.emptyState.style.display = 'none';
        elements.refreshIcon.classList.add('spinning');
        elements.refreshBtn.disabled = true;

        try {
            const response = await fetch('/api/releases');
            if (!response.ok) {
                throw new Error(`Server returned status ${response.status}`);
            }
            
            const result = await response.json();
            if (result.status === 'success') {
                rawReleases = result.releases;
                parsedReleases = parseRawReleases(rawReleases);
                
                updateStats();
                renderTimeline();
                showToast('Release notes successfully updated!', 'success');
            } else {
                throw new Error(result.message || 'Unknown server error');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            elements.errorMessage.textContent = error.message || 'Could not connect to the server.';
            elements.errorState.style.display = 'flex';
            showToast('Failed to refresh release notes feed.', 'error');
        } finally {
            elements.loadingState.style.display = 'none';
            elements.refreshIcon.classList.remove('spinning');
            elements.refreshBtn.disabled = false;
        }
    };

    /* ==========================================
       DASHBOARD STATS
       ========================================== */
    const updateStats = () => {
        let totalEntries = parsedReleases.length;
        let totalFeatures = 0;
        let totalDeprecations = 0;
        let totalIssues = 0;
        
        parsedReleases.forEach(release => {
            release.notes.forEach(note => {
                if (note.type === 'feature') totalFeatures++;
                else if (note.type === 'deprecation') totalDeprecations++;
                else if (note.type === 'issue') totalIssues++;
            });
        });
        
        // Animate counter values
        animateCounter(elements.statEntries, totalEntries);
        animateCounter(elements.statFeatures, totalFeatures);
        animateCounter(elements.statDeprecations, totalDeprecations);
        animateCounter(elements.statIssues, totalIssues);
    };

    const animateCounter = (element, targetValue) => {
        let start = 0;
        const duration = 800; // ms
        const stepTime = 30;
        const steps = duration / stepTime;
        const increment = targetValue / steps;
        
        if (targetValue === 0) {
            element.textContent = '0';
            return;
        }

        const timer = setInterval(() => {
            start += increment;
            if (start >= targetValue) {
                element.textContent = Math.round(targetValue).toLocaleString();
                clearInterval(timer);
            } else {
                element.textContent = Math.round(start).toLocaleString();
            }
        }, stepTime);
    };

    /* ==========================================
       TIMELINE RENDERING
       ========================================== */
    const getCategoryIcon = (type) => {
        switch (type) {
            case 'feature': return 'sparkles';
            case 'deprecation': return 'alert-triangle';
            case 'issue': return 'bug';
            case 'change': return 'refresh-cw';
            case 'notice': return 'info';
            default: return 'info';
        }
    };

    const copyNoteLink = (noteId) => {
        // Construct the link with the note ID as a hash
        const url = new URL(window.location.href);
        url.hash = noteId;
        
        navigator.clipboard.writeText(url.href)
            .then(() => {
                showToast('Link copied to clipboard!', 'success');
            })
            .catch(err => {
                console.error('Could not copy link:', err);
                showToast('Failed to copy link.', 'error');
            });
    };

    const copyNoteText = (dateTitle, note) => {
        const textToCopy = `BigQuery Release Update (${dateTitle}) - ${note.typeLabel}:\n${note.plainText.trim()}`;
        
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                showToast('Note content copied to clipboard!', 'success');
            })
            .catch(err => {
                console.error('Could not copy note text:', err);
                showToast('Failed to copy note content.', 'error');
            });
    };

    const exportToCSV = () => {
        if (parsedReleases.length === 0) {
            showToast('No data available to export.', 'error');
            return;
        }

        const currentFilteredNotes = [];
        
        // Replicate current filters and search to export exactly what is shown
        let filtered = parsedReleases.map(release => {
            const matchingNotes = release.notes.filter(note => {
                if (state.filterType !== 'all' && note.type !== state.filterType) {
                    return false;
                }
                if (state.searchQuery) {
                    const query = state.searchQuery.toLowerCase();
                    const matchesTitle = release.title.toLowerCase().includes(query);
                    const matchesCategory = note.typeLabel.toLowerCase().includes(query);
                    const matchesContent = note.plainText.includes(query);
                    return matchesTitle || matchesCategory || matchesContent;
                }
                return true;
            });
            return {
                ...release,
                notes: matchingNotes
            };
        }).filter(release => release.notes.length > 0);

        if (state.sortBy === 'newest') {
            filtered.sort((a, b) => new Date(b.updated) - new Date(a.updated));
        } else {
            filtered.sort((a, b) => new Date(a.updated) - new Date(b.updated));
        }

        filtered.forEach(release => {
            release.notes.forEach(note => {
                currentFilteredNotes.push({
                    date: release.title,
                    updated: release.updated,
                    category: note.typeLabel,
                    description: note.plainText.replace(/\s+/g, ' ').trim()
                });
            });
        });

        if (currentFilteredNotes.length === 0) {
            showToast('No matching notes to export with current filters.', 'error');
            return;
        }

        const escapeCSV = (text) => {
            if (!text) return '""';
            return '"' + text.replace(/"/g, '""') + '"';
        };

        const csvHeaders = ['Date', 'Updated Timestamp', 'Category', 'Description'];
        const csvRows = [csvHeaders.join(',')];

        currentFilteredNotes.forEach(item => {
            const row = [
                escapeCSV(item.date),
                escapeCSV(item.updated),
                escapeCSV(item.category),
                escapeCSV(item.description)
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csvRows.join('\n'));
        const link = document.createElement('a');
        link.setAttribute('href', csvContent);
        link.setAttribute('download', `bigquery_release_notes_${state.filterType}_${state.sortBy}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast(`Exported ${currentFilteredNotes.length} notes to CSV!`, 'success');
    };

    const shareOnTwitter = (dateTitle, note) => {
        const url = new URL(window.location.href);
        url.hash = note.id;
        
        // Clean and truncate text content for the tweet
        let cleanText = note.plainText;
        if (cleanText.length > 150) {
            cleanText = cleanText.substring(0, 150) + '...';
        }
        
        const tweetText = `BigQuery Release Update (${dateTitle}) - ${note.typeLabel}:\n"${cleanText}"`;
        
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(url.href)}&hashtags=BigQuery,GoogleCloud`;
        
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
        showToast('Opening X / Twitter...', 'success');
    };

    const renderTimeline = () => {
        elements.timelineContainer.innerHTML = '';
        
        // Filter and sort releases
        let filtered = parsedReleases.map(release => {
            // Filter notes inside each day's release
            const matchingNotes = release.notes.filter(note => {
                // Type filter
                if (state.filterType !== 'all' && note.type !== state.filterType) {
                    return false;
                }
                
                // Search query filter
                if (state.searchQuery) {
                    const query = state.searchQuery.toLowerCase();
                    const matchesTitle = release.title.toLowerCase().includes(query);
                    const matchesCategory = note.typeLabel.toLowerCase().includes(query);
                    const matchesContent = note.plainText.includes(query);
                    return matchesTitle || matchesCategory || matchesContent;
                }
                
                return true;
            });
            
            return {
                ...release,
                notes: matchingNotes
            };
        }).filter(release => release.notes.length > 0); // Keep only days that have notes

        // Sort days
        if (state.sortBy === 'newest') {
            filtered.sort((a, b) => new Date(b.updated) - new Date(a.updated));
        } else {
            filtered.sort((a, b) => new Date(a.updated) - new Date(b.updated));
        }

        if (filtered.length === 0) {
            elements.timelineContainer.style.display = 'none';
            elements.emptyState.style.display = 'flex';
            return;
        }

        elements.emptyState.style.display = 'none';
        elements.timelineContainer.style.display = 'block';

        filtered.forEach(release => {
            const dayGroup = document.createElement('div');
            dayGroup.className = 'timeline-day-group';
            dayGroup.id = release.id;
            
            const dot = document.createElement('div');
            dot.className = 'timeline-dot';
            
            const dateTitle = document.createElement('h3');
            dateTitle.className = 'timeline-date-title';
            dateTitle.innerHTML = `<i data-lucide="calendar" style="width: 18px; height: 18px;"></i> ${release.title}`;
            
            const cardsList = document.createElement('div');
            cardsList.className = 'timeline-cards-list';
            
            release.notes.forEach(note => {
                const card = document.createElement('div');
                card.className = `note-card ${note.type}`;
                card.id = note.id;
                
                const header = document.createElement('div');
                header.className = 'note-header';
                
                const badge = document.createElement('div');
                badge.className = `note-badge ${note.type}`;
                badge.innerHTML = `<i data-lucide="${getCategoryIcon(note.type)}" style="width: 14px; height: 14px;"></i> <span>${note.typeLabel}</span>`;
                
                const actions = document.createElement('div');
                actions.className = 'note-actions';
                
                const tweetBtn = document.createElement('button');
                tweetBtn.className = 'btn-card-action';
                tweetBtn.setAttribute('title', 'Tweet about this update');
                tweetBtn.innerHTML = '<i data-lucide="twitter" style="width: 16px; height: 16px;"></i>';
                tweetBtn.addEventListener('click', () => shareOnTwitter(release.title, note));
                
                const copyBtn = document.createElement('button');
                copyBtn.className = 'btn-card-action';
                copyBtn.setAttribute('title', 'Copy link to this release note');
                copyBtn.innerHTML = '<i data-lucide="share-2" style="width: 16px; height: 16px;"></i>';
                copyBtn.addEventListener('click', () => copyNoteLink(note.id));
                
                const copyTextBtn = document.createElement('button');
                copyTextBtn.className = 'btn-card-action';
                copyTextBtn.setAttribute('title', 'Copy note content to clipboard');
                copyTextBtn.innerHTML = '<i data-lucide="copy" style="width: 16px; height: 16px;"></i>';
                copyTextBtn.addEventListener('click', () => copyNoteText(release.title, note));
                
                actions.appendChild(tweetBtn);
                actions.appendChild(copyBtn);
                actions.appendChild(copyTextBtn);
                header.appendChild(badge);
                header.appendChild(actions);
                
                const content = document.createElement('div');
                content.className = 'note-content';
                content.innerHTML = note.content;
                
                card.appendChild(header);
                card.appendChild(content);
                cardsList.appendChild(card);
            });
            
            dayGroup.appendChild(dot);
            dayGroup.appendChild(dateTitle);
            dayGroup.appendChild(cardsList);
            elements.timelineContainer.appendChild(dayGroup);
        });

        // Initialize Lucide Icons in dynamically created elements
        lucide.createIcons();

        // If there's a hash in the URL, scroll to it
        handleHashNavigation();
    };

    const handleHashNavigation = () => {
        const hash = window.location.hash;
        if (hash) {
            const targetElement = document.getElementById(hash.substring(1));
            if (targetElement) {
                setTimeout(() => {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Highlight the target card briefly
                    targetElement.style.outline = '2px solid var(--accent-blue)';
                    targetElement.style.boxShadow = '0 0 15px rgba(var(--accent-blue-rgb), 0.4)';
                    setTimeout(() => {
                        targetElement.style.outline = 'none';
                        targetElement.style.boxShadow = '';
                    }, 2000);
                }, 400);
            }
        }
    };

    /* ==========================================
       EVENT HANDLERS
       ========================================== */
    // Search input handler
    elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim();
        elements.clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
        renderTimeline();
    });

    // Clear search button
    elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchQuery = '';
        elements.clearSearchBtn.style.display = 'none';
        renderTimeline();
    });

    // Filter pills handler
    elements.filterPills.addEventListener('click', (e) => {
        const pill = e.target.closest('.pill');
        if (!pill) return;
        
        // Remove active class from all pills
        elements.filterPills.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        
        // Set clicked pill active
        pill.classList.add('active');
        state.filterType = pill.getAttribute('data-filter');
        
        renderTimeline();
    });

    // Sort handler
    elements.sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderTimeline();
    });

    // Reset filters
    elements.resetFiltersBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchQuery = '';
        elements.clearSearchBtn.style.display = 'none';
        
        elements.filterPills.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        elements.filterPills.querySelector('[data-filter="all"]').classList.add('active');
        state.filterType = 'all';
        
        state.sortBy = 'newest';
        elements.sortSelect.value = 'newest';
        
        renderTimeline();
    });

    // Refresh button
    elements.refreshBtn.addEventListener('click', fetchFeed);
    elements.retryBtn.addEventListener('click', fetchFeed);
    elements.exportCsvBtn.addEventListener('click', exportToCSV);

    // Scroll and Back to Top
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            elements.backToTop.classList.add('visible');
        } else {
            elements.backToTop.classList.remove('visible');
        }
    });

    elements.backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Handle hash change in window url
    window.addEventListener('hashchange', handleHashNavigation);

    /* ==========================================
       APP INITIALIZATION
       ========================================== */
    initTheme();
    fetchFeed();
});
