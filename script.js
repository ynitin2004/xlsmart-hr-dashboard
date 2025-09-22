// Navigation functionality
document.addEventListener('DOMContentLoaded', function() {
    // Handle navigation
    const navLinks = document.querySelectorAll('.nav-link');
    const contentSections = document.querySelectorAll('.content-section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all nav items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Add active class to clicked nav item
            this.parentElement.classList.add('active');
            
            // Hide all content sections
            contentSections.forEach(section => {
                section.classList.remove('active');
            });
            
            // Show selected content section
            const targetSection = this.getAttribute('data-section');
            document.getElementById(targetSection).classList.add('active');
        });
    });
    
    // Initialize charts
    initializeCharts();
    
    // Search functionality
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const tableRows = document.querySelectorAll('.employee-table tbody tr');
            
            tableRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
    
    // Add some interactivity to metric cards
    const metricCards = document.querySelectorAll('.metric-card');
    metricCards.forEach(card => {
        card.addEventListener('click', function() {
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });
});

// Chart initialization with simple HTML charts
function initializeCharts() {
    // Department Distribution Chart - replace with simple bars
    const departmentCtx = document.getElementById('departmentChart');
    if (departmentCtx) {
        const chartContainer = departmentCtx.parentElement;
        chartContainer.innerHTML = `
            <h3>Employee Distribution by Department</h3>
            <div class="simple-chart">
                <div class="chart-bar">
                    <div class="bar-label">Engineering</div>
                    <div class="bar" style="width: 85%; background: #667eea;">85</div>
                </div>
                <div class="chart-bar">
                    <div class="bar-label">Marketing</div>
                    <div class="bar" style="width: 35%; background: #764ba2;">35</div>
                </div>
                <div class="chart-bar">
                    <div class="bar-label">Sales</div>
                    <div class="bar" style="width: 45%; background: #f093fb;">45</div>
                </div>
                <div class="chart-bar">
                    <div class="bar-label">HR</div>
                    <div class="bar" style="width: 12%; background: #f5576c;">12</div>
                </div>
                <div class="chart-bar">
                    <div class="bar-label">Finance</div>
                    <div class="bar" style="width: 28%; background: #4facfe;">28</div>
                </div>
                <div class="chart-bar">
                    <div class="bar-label">Operations</div>
                    <div class="bar" style="width: 42%; background: #00f2fe;">42</div>
                </div>
            </div>
        `;
    }
    
    // Attendance Trend Chart - replace with simple trend line
    const attendanceCtx = document.getElementById('attendanceChart');
    if (attendanceCtx) {
        const chartContainer = attendanceCtx.parentElement;
        chartContainer.innerHTML = `
            <h3>Monthly Attendance Trend</h3>
            <div class="simple-trend">
                <div class="trend-line">
                    <div class="trend-point" style="left: 8.33%; top: 40%;" title="Jan: 92%"></div>
                    <div class="trend-point" style="left: 16.66%; top: 60%;" title="Feb: 89%"></div>
                    <div class="trend-point" style="left: 25%; top: 20%;" title="Mar: 94%"></div>
                    <div class="trend-point" style="left: 33.33%; top: 10%;" title="Apr: 96%"></div>
                    <div class="trend-point" style="left: 41.66%; top: 30%;" title="May: 93%"></div>
                    <div class="trend-point" style="left: 50%; top: 15%;" title="Jun: 95%"></div>
                    <div class="trend-point" style="left: 58.33%; top: 20%;" title="Jul: 94%"></div>
                    <div class="trend-point" style="left: 66.66%; top: 5%;" title="Aug: 97%"></div>
                    <div class="trend-point" style="left: 75%; top: 20%;" title="Sep: 94%"></div>
                    <div class="trend-point" style="left: 83.33%; top: 10%;" title="Oct: 96%"></div>
                    <div class="trend-point" style="left: 91.66%; top: 30%;" title="Nov: 93%"></div>
                    <div class="trend-point" style="left: 100%; top: 20%;" title="Dec: 94%"></div>
                </div>
                <div class="trend-labels">
                    <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span>
                </div>
            </div>
        `;
    }
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatPercentage(value) {
    return (value * 100).toFixed(1) + '%';
}

// Simulate real-time updates
function updateMetrics() {
    // This would typically fetch data from an API
    const attendanceRate = document.querySelector('.metric-card:nth-child(3) .metric-value');
    if (attendanceRate) {
        const currentRate = parseFloat(attendanceRate.textContent);
        const newRate = currentRate + (Math.random() - 0.5) * 0.5;
        attendanceRate.textContent = newRate.toFixed(1) + '%';
    }
}

// Update metrics every 30 seconds (for demo purposes)
setInterval(updateMetrics, 30000);

// Add some animation effects
function addScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    });
    
    const animatedElements = document.querySelectorAll('.metric-card, .chart-card, .activity-card');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Initialize animations when page loads
document.addEventListener('DOMContentLoaded', addScrollAnimations);

// Mobile menu toggle (for future mobile navigation)
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('mobile-active');
}

// Export functions for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeCharts,
        formatCurrency,
        formatPercentage,
        updateMetrics
    };
}