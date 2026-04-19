const app = {
    API_URL: '/api',
    currentCitizenId: localStorage.getItem('citizen_id'),
    allSchemes: [],
    eligibleSchemes: [],
    selectedScheme: null,

    init: function() {
        lucide.createIcons();
        
        // Load theme preference
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);

        const path = window.location.pathname;
        if (path.includes('dashboard.html')) {
            if (!this.currentCitizenId) {
                window.location.href = 'login.html';
                return;
            }
            this.loadDashboard();
        }
    },


    navigate: function(page) {
        window.location.href = page;
    },

    showToast: function(message, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    },

    handleLogin: async function(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const res = await fetch(`${this.API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (data.status === 'success') {
                localStorage.setItem('citizen_id', data.citizen_id);
                this.currentCitizenId = data.citizen_id;
                this.showToast('Securely Logged In', 'success');
                setTimeout(() => window.location.href = 'dashboard.html', 500);
            } else {
                this.showToast(data.message || 'Invalid credentials', 'error');
            }
        } catch (err) {
            this.showToast('Server connection failed', 'error');
        }
    },

    handleSignup: async function(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await fetch(`${this.API_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();

            if (result.status === 'success') {
                this.showToast('Registration Successful!', 'success');
                setTimeout(() => window.location.href = 'login.html', 1000);
            } else {
                this.showToast(result.message || 'Registration failed', 'error');
            }
        } catch (err) {
            this.showToast('Server connection failed', 'error');
        }
    },

    loadDashboard: async function() {
        await this.loadProfile();
        await this.loadSchemes();
        await this.loadEligible();
        await this.loadCategories();
        await this.loadLifeEvents();
        await this.loadApplications();
        this.showEligibilityBanner();
        
        if (!sessionStorage.getItem('onboarding_shown')) {
            document.getElementById('onboarding').classList.remove('hidden');
        }
    },


    loadProfile: async function() {
        try {
            const res = await fetch(`${this.API_URL}/profile?citizen_id=${this.currentCitizenId}`);
            this.citizenData = await res.json();
            const user = this.citizenData;
            
            document.getElementById('dash-greeting').innerHTML = `Hello, ${user.first_name}`;
            document.getElementById('dash-details').innerText = `${user.occupation} • ${user.city}, ${user.state}`;
            document.getElementById('user-avatar').innerText = user.first_name[0];
            document.getElementById('stat-applied').innerText = user.applied_count;
            
            this.renderProfile();
        } catch (e) {}
    },

    renderProfile: function() {
        const user = this.citizenData;
        const container = document.getElementById('profile-details');
        if (!container || !user) return;

        const aadhaar = String(user.aadhaar_number || '000000000000');
        const dob = user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A';
        const income = typeof user.annual_income === 'number' ? `₹ ${user.annual_income.toLocaleString('en-IN')}` : `₹ ${user.annual_income}`;
        
        const fields = [
            { label: 'Full Name', value: `${user.first_name} ${user.last_name}`, icon: 'user' },
            { label: 'Aadhaar Number', value: `XXXX-XXXX-${aadhaar.slice(-4)}`, icon: 'credit-card' },
            { label: 'Email Address', value: user.email, icon: 'mail' },
            { label: 'Date of Birth', value: dob, icon: 'calendar' },
            { label: 'Gender', value: user.gender, icon: 'users' },
            { label: 'Annual Income', value: income, icon: 'indian-rupee' },
            { label: 'Occupation', value: user.occupation || 'N/A', icon: 'briefcase' },
            { label: 'State', value: user.state_of_residence || 'N/A', icon: 'map-pin' },
            { label: 'City', value: user.city || 'N/A', icon: 'building' },
            { label: 'Pincode', value: user.pincode || 'N/A', icon: 'hash' },
            { label: 'Contact Number', value: user.contact_number || 'N/A', icon: 'phone' },
        ];

        container.innerHTML = fields.map(f => `
            <div class="profile-item">
                <span class="profile-label">${f.label}</span>
                <span class="profile-value">${f.value}</span>
            </div>
        `).join('');
    },




    loadSchemes: async function() {
        try {
            const res = await fetch(`${this.API_URL}/schemes?citizen_id=${this.currentCitizenId}`);
            this.allSchemes = await res.json();
            this.activeCategory = 'ALL';
            
            const eligible = this.allSchemes.filter(s => s.eligible === true || s.eligible === 'true' || s.eligible === 1);
            const ineligible = this.allSchemes.filter(s => !(s.eligible === true || s.eligible === 'true' || s.eligible === 1));
            
            this.renderSchemes(eligible, 'all-schemes-container');
            this.renderSchemes(ineligible, 'ineligible-schemes-container');
        } catch (e) { console.error('loadSchemes error:', e); }
    },

    showEligibilityBanner: function() {
        const count = this.eligibleSchemes ? this.eligibleSchemes.length : 0;
        const banner = document.getElementById('eligibility-banner');
        const text = document.getElementById('banner-text');
        if (count > 0 && banner) {
            text.textContent = `🎉 You are eligible for ${count} government scheme${count > 1 ? 's' : ''}!`;
            banner.classList.remove('hidden');
            banner.style.display = 'flex';
        }
        const obText = document.getElementById('onboarding-eligible-text');
        if (obText && count > 0) {
            obText.textContent = `We found ${count} schemes that match your profile. Check your "Recommended" section.`;
        }
    },

    loadCategories: async function() {
        try {
            const res = await fetch(`${this.API_URL}/categories`);
            const cats = await res.json();
            const container = document.getElementById('category-filters');
            if (!container) return;
            const chips = cats.map(c => 
                `<button class="category-chip" data-cat="${c.category_name}" onclick="app.filterByCategory('${c.category_name}', this)">${c.category_name}</button>`
            ).join('');
            container.innerHTML = `<button class="category-chip active" onclick="app.filterByCategory('ALL', this)">All</button>` + chips;
        } catch (e) {}
    },

    filterByCategory: function(category, btn) {
        this.activeCategory = category;
        document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
        if (btn) btn.classList.add('active');

        const searchVal = document.getElementById('scheme-search')?.value || '';
        this.applyFilters(searchVal, category);
    },

    filterSchemes: function(query) {
        this.applyFilters(query, this.activeCategory || 'ALL');
    },

    applyFilters: function(query, category) {
        let filtered = this.allSchemes;
        if (query) {
            const q = query.toLowerCase();
            filtered = filtered.filter(s =>
                s.name.toLowerCase().includes(q) ||
                (s.desc || '').toLowerCase().includes(q) ||
                (s.categories || '').toLowerCase().includes(q)
            );
        }
        if (category && category !== 'ALL') {
            filtered = filtered.filter(s => (s.categories || '').includes(category));
        }
        const eligible = filtered.filter(s => s.eligible === true || s.eligible === 'true' || s.eligible === 1);
        const ineligible = filtered.filter(s => !(s.eligible === true || s.eligible === 'true' || s.eligible === 1));
        this.renderSchemes(eligible, 'all-schemes-container');
        this.renderSchemes(ineligible, 'ineligible-schemes-container');
    },

    loadLifeEvents: async function() {
        try {
            const res = await fetch(`${this.API_URL}/life-events?citizen_id=${this.currentCitizenId}`);
            const events = await res.json();
            const container = document.getElementById('life-events-container');
            if (!container) return;

            const icons = { 'Turning 18': 'graduation-cap', 'Turning 60': 'heart-handshake', 'Marriage': 'heart', 'Girl Child': 'baby', 'Buying House': 'home', 'Becoming Farmer': 'wheat', 'Pregnancy': 'baby', 'Disability Support': 'accessibility' };

            container.innerHTML = events.map(e => `
                <div class="scheme-card" style="cursor:pointer; text-align:center;" onclick="app.showLifeEventSchemes(${e.id}, '${e.name}')">
                    <div style="font-size: 2.5rem; margin-bottom: 1rem;">
                        <i data-lucide="${icons[e.name] || 'calendar'}" style="width:48px; height:48px; color: var(--primary);"></i>
                    </div>
                    <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">${e.name}</h3>
                    <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1rem;">${e.description}</p>
                    <span class="status-badge status-approved" style="font-size:0.75rem;">${e.scheme_ids.length} scheme${e.scheme_ids.length !== 1 ? 's' : ''}</span>
                </div>
            `).join('');
            this.lifeEvents = events;
            lucide.createIcons();
        } catch (e) { console.error('loadLifeEvents error:', e); }
    },

    showLifeEventSchemes: function(eventId, eventName) {
        const event = this.lifeEvents.find(e => e.id === eventId);
        if (!event) return;
        document.getElementById('life-events-container').classList.add('hidden');
        document.getElementById('life-event-schemes').classList.remove('hidden');
        document.getElementById('life-event-title').textContent = `Schemes for: ${eventName}`;

        const matched = this.allSchemes.filter(s => event.scheme_ids.includes(s.id));
        this.renderSchemes(matched.length > 0 ? matched : [], 'life-event-schemes-container');
        if (matched.length === 0) {
            document.getElementById('life-event-schemes-container').innerHTML = '<p style="color:var(--text-muted); padding: 2rem;">No schemes linked to this life event yet.</p>';
        }
    },

    clearLifeEvent: function() {
        document.getElementById('life-events-container').classList.remove('hidden');
        document.getElementById('life-event-schemes').classList.add('hidden');
    },






    loadEligible: async function() {
        try {
            const res = await fetch(`${this.API_URL}/eligibility?citizen_id=${this.currentCitizenId}`);
            this.eligibleSchemes = await res.json();
            this.renderSchemes(this.eligibleSchemes, 'eligible-container');
            document.getElementById('stat-eligible').innerText = this.eligibleSchemes.length;
        } catch (e) {}
    },

    loadApplications: async function() {
        try {
            const res = await fetch(`${this.API_URL}/applications?citizen_id=${this.currentCitizenId}`);
            const apps = await res.json();
            const list = document.getElementById('applications-list');
            
            if (apps.length === 0) {
                list.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem; color: var(--text-muted);">No applications found. Apply for a scheme to see it here!</td></tr>';
                return;
            }

            list.innerHTML = apps.map(a => `
                <tr>
                    <td><strong>${a.scheme_name}</strong></td>
                    <td><span class="badge ${a.auth === 'Central' ? 'badge-central' : 'badge-state'}">${a.auth}</span></td>
                    <td>${new Date(a.date).toLocaleDateString()}</td>
                    <td><span class="status-badge status-${a.status.toLowerCase()}">${a.status}</span></td>
                </tr>
            `).join('');
        } catch (e) {}
    },

    renderSchemes: function(schemes, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (schemes.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted); grid-column: 1/-1; padding: 2rem; text-align: center;">No schemes found.</p>';
            return;
        }

        container.innerHTML = schemes.map(s => {
            const isEligible = s.eligible === true || s.eligible === 'true' || s.eligible === 1;
            const reason = s.reason || "Profile Matched";

            const categories = s.categories || "General";

            return `
                <div class="scheme-card ${!isEligible ? 'ineligible-card' : ''}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <span class="badge ${s.authClass}">${s.auth}</span>
                        <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">${categories}</span>
                    </div>
                    
                    <h3 style="margin-bottom: 0.5rem; font-size: 1.25rem;">${s.name}</h3>
                    <p class="benefit-tag"><i data-lucide="sparkles"></i> ${s.benefit || 'Variable Benefits'}</p>
                    
                    <p style="color:var(--text-muted); font-size:0.875rem; margin-bottom:1.5rem; line-height:1.5;">
                        ${s.desc ? s.desc.substring(0, 80) : ''}${s.desc && s.desc.length > 80 ? '...' : ''}
                    </p>
                    
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--glass-border);">
                        <span class="status-badge ${isEligible ? 'status-approved' : 'status-rejected'}" style="font-size: 0.75rem; padding: 0.3rem 0.8rem;">
                            ${isEligible ? 'ELIGIBLE' : 'INELIGIBLE'}
                        </span>

                        ${!isEligible ? `<span style="font-size: 0.8rem; color: #991B1B; font-weight: 500;">${reason}</span>` : ''}
                    </div>




                <div class="scheme-footer" style="margin-top:auto;">
                    <button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size:0.875rem;" onclick="app.openModal(${s.id})">Details</button>
                    ${isEligible ? `
                        <button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size:0.875rem;" onclick="app.openModal(${s.id})">Apply</button>
                    ` : ''}
                </div>
            </div>
            `;
        }).join('');

        lucide.createIcons();
    },




    showTab: function(tab, navEl) {
        document.querySelectorAll('[id^="tab-"]').forEach(t => t.classList.add('hidden'));
        const activeTab = document.getElementById(`tab-${tab}`);
        if (activeTab) activeTab.classList.remove('hidden');
        
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        if (navEl) navEl.classList.add('active');
        else if (event && event.currentTarget) event.currentTarget.classList.add('active');

        if (tab === 'applications') this.loadApplications();
        if (tab === 'profile') this.renderProfile();
        if (tab === 'life-events') {
            this.clearLifeEvent();
        }
        
        lucide.createIcons();
    },


    nextOnboardingStep: function(step) {
        document.querySelectorAll('.onboarding-step').forEach(s => s.classList.remove('active'));
        document.getElementById(`step-${step}`).classList.add('active');
        lucide.createIcons();
    },

    closeOnboarding: function() {
        document.getElementById('onboarding').classList.add('hidden');
        sessionStorage.setItem('onboarding_shown', 'true');
    },

    openModal: function(id) {

        const scheme = this.allSchemes.find(s => s.id === id) || this.eligibleSchemes.find(s => s.id === id);
        if (!scheme) return;
        this.selectedScheme = scheme;

        const body = document.getElementById('modal-body');
        const isEligible = scheme.eligible === true || scheme.eligible === 'true' || scheme.eligible === 1;
        const reason = scheme.reason || "Profile Matched";


        body.innerHTML = `
            <span class="badge ${scheme.authClass}">${scheme.auth}</span>
            <h2 style="margin: 1rem 0;">${scheme.name}</h2>
            <div style="background:#f1f5f9; padding:1.5rem; border-radius:var(--radius-md); margin-bottom:1.5rem;">
                <h3 style="color:var(--secondary); font-size:1.5rem; margin-bottom:0.5rem;">${scheme.benefit}</h3>
                <p style="color:var(--text-muted); font-size:0.9rem;"><i data-lucide="clock" style="width:14px;"></i> Tenure: ${scheme.tenure}</p>
            </div>
            
            <div style="margin-bottom: 2rem;">
                <h4 style="margin-bottom: 1rem;">Profile Mapping Check</h4>
                <div style="background: white; border: 1px solid var(--glass-border); border-radius: 12px; padding: 1rem;">
                    ${scheme.breakdown && scheme.breakdown.length > 0 ? 
                        scheme.breakdown.map(b => `<p style="margin-bottom:0.5rem; font-size:0.9rem;">${b}</p>`).join('') : 
                        '<p style="color:var(--text-muted);">No specific criteria mapped.</p>'
                    }
                </div>
            </div>

            <h4>Official Mandate</h4>

            <p style="color:var(--text-main); margin-bottom:1.5rem; line-height:1.6;">${scheme.offDesc}</p>
            <h4>Eligibility Requirements</h4>
            <div class="criteria-list">
                ${scheme.criteriaHtml}
            </div>
        `;
        
        const applyBtn = document.getElementById('modal-apply-btn');
        if (applyBtn) {
            applyBtn.style.display = isEligible ? 'block' : 'none';
        }

        document.getElementById('scheme-modal').classList.remove('hidden');
        lucide.createIcons();
    },



    closeModal: function() {
        document.getElementById('scheme-modal').classList.add('hidden');
    },

    handleApply: async function() {
        if (!this.selectedScheme) return;
        const btn = document.getElementById('modal-apply-btn');
        btn.innerText = 'Applying...';
        btn.disabled = true;

        try {
            const res = await fetch(`${this.API_URL}/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    citizen_id: this.currentCitizenId,
                    scheme_id: this.selectedScheme.id
                })
            });
            const data = await res.json();

            if (data.status === 'success') {
                this.showToast('Application Submitted Successfully!', 'success');
                this.closeModal();
                this.loadDashboard();
            } else {
                this.showToast(data.message || 'Application failed', 'error');
            }
        } catch (e) {
            this.showToast('Server error', 'error');
        } finally {
            btn.innerText = 'Apply Now';
            btn.disabled = false;
        }
    },

    filterSchemes: function(query) {
        const filtered = this.allSchemes.filter(s => 
            s.name.toLowerCase().includes(query.toLowerCase()) || 
            s.desc.toLowerCase().includes(query.toLowerCase())
        );
        this.renderSchemes(filtered, 'all-schemes-container');
    },

    logout: function() {
        localStorage.removeItem('citizen_id');
        sessionStorage.removeItem('onboarding_shown');
        window.location.href = 'index.html';
    },

    toggleTheme: function() {
        const body = document.body;
        const current = body.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        body.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
    }

};

window.onload = () => app.init();
