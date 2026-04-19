const app = {
    currentFilter: 'All',

    // Nav logic
    navigate: function(screenId) {
        document.querySelectorAll('.screen').forEach(el => {
            el.classList.remove('active');
            el.classList.add('hidden');
        });
        const target = document.getElementById(screenId);
        target.classList.remove('hidden');
        
        setTimeout(() => {
            target.classList.add('active');
        }, 50);

        if (screenId === 'dashboard-screen') {
            document.getElementById('main-wrapper').classList.add('dashboard-mode');
            this.renderEligibleSchemes();
            this.renderBrowseSchemes();
        } else {
            document.getElementById('main-wrapper').classList.remove('dashboard-mode');
        }
    },

    logout: function() {
        this.showToast('Logged out securely.', 'success');
        this.navigate('welcome-screen');
    },

    // UI Toast Messages
    showToast: function(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    },

    // OTP Simulation
    simulateOTP: function() {
        const btn = document.getElementById('btn-send-otp');
        const email = document.getElementById('login-email').value;
        const aadhaar = document.getElementById('login-aadhaar').value;
        
        if (!email || aadhaar.length !== 12) {
            this.showToast('Enter valid Email & 12-digit Aadhaar first', 'error');
            return;
        }

        btn.textContent = 'Sending...';
        btn.disabled = true;

        setTimeout(() => {
            btn.textContent = 'OTP Sent';
            const otpInput = document.getElementById('login-otp');
            otpInput.disabled = false;
            otpInput.focus();
            
            this.showToast(`OTP for registered number: 123456`, 'success');
            
            otpInput.addEventListener('input', (event) => {
                if (event.target.value === '123456') {
                    document.getElementById('btn-login').disabled = false;
                }
            });
        }, 1200);
    },

    handleLogin: async function(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const otp = document.getElementById('login-otp').value;

        if (otp !== '123456') {
            this.showToast('Invalid OTP Verification.', 'error');
            return;
        }

        try {
            const formData = new URLSearchParams();
            formData.append('email', email);
            formData.append('password', password);

            const res = await fetch('/api/login', { method: 'POST', body: formData.toString() });
            const data = await res.json();

            if(data.status === 'success') {
                this.currentCitizenId = data.citizen_id;
                this.loadProfileDetails();
                this.showToast('Login Successful! Building Dashboard...', 'success');
                setTimeout(() => this.navigate('dashboard-screen'), 500);
            } else {
                this.showToast('Invalid Email or Password matches.', 'error');
            }
        } catch(err) {
            console.error(err);
            this.currentCitizenId = 1; // Fallback simulation
            this.showToast('[OFFLINE] Simulated Login Configured.', 'success');
            setTimeout(() => this.navigate('dashboard-screen'), 800);
        }
    },

    handleSignup: async function(e) {
        e.preventDefault();
        const form = e.target;
        const btn = document.getElementById('btn-signup');
        btn.disabled = true;
        btn.textContent = 'Registering inside DB...';

        try {
            const formData = new URLSearchParams();
            new FormData(form).forEach((value, key) => {
                formData.append(key, value);
            });

            const res = await fetch('/api/signup', { method: 'POST', body: formData.toString() });
            const data = await res.json();
            
            if(data.status === 'success') {
                this.showToast('Secure Registration Complete!', 'success');
                form.reset();
                setTimeout(() => this.navigate('login-screen'), 1200);
            } else {
                this.showToast('Registration failed. Has this Aadhaar or Email been used already?', 'error');
            }
        } catch(err) {
            this.showToast('Network error while registering', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Complete Registration';
        }
    },

    loadProfileDetails: async function() {
        try {
            const res = await fetch('/api/profile?citizen_id=' + this.currentCitizenId);
            const user = await res.json();
            
            // Header Topbar Data Source Binding
            const fullName = user.first_name + ' ' + user.last_name;
            document.getElementById('dash-greeting').innerHTML = `Welcome back, <span>${user.first_name}</span>`;
            document.getElementById('dash-details').innerText = `${user.city || 'Citizen'}, ${user.state}`;
            document.getElementById('dash-avatar').src = `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=E6A817&color=fff&rounded=true`;
            
            // Sidebar Data Source Binding
            document.getElementById('sidebar-avatar').src = `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}&background=E6A817&color=fff&rounded=true`;
            document.getElementById('side-name').innerText = fullName;
            document.getElementById('side-sub').innerText = 'Citizen ID: Gov-' + this.currentCitizenId;
            document.getElementById('side-aadhaar').innerText = 'XXXX XXXX ' + user.aadhaar.substring(8);
            document.getElementById('side-email').innerText = user.email;
            document.getElementById('side-occ').innerText = user.occupation || 'N/A';
            document.getElementById('side-inc').innerText = '₹ ' + user.income.toLocaleString();
            document.getElementById('side-state').innerText = user.state;
            
            // Counters Binding
            this.animateCount(3, user.applied_count);
        } catch(e) {}
    },

    animateCount: function(counterIndex, targetValue) {
        const counter = document.querySelectorAll('.counter')[counterIndex];
        counter.innerText = '0';
        if(targetValue === 0) return;
        const increment = Math.max(1, Math.floor(targetValue / 40)); 
        
        const updateCounter = () => {
            const c = +counter.innerText;
            if(c < targetValue) {
                counter.innerText = Math.min(targetValue, c + increment);
                setTimeout(updateCounter, 30);
            } else {
                counter.innerText = targetValue.toLocaleString();
            }
        };
        updateCounter();
    },

    allSchemes: [],

    toggleProfile: function() {
        const slidebar = document.getElementById('profile-slidebar');
        if(slidebar.classList.contains('open')) {
            slidebar.classList.remove('open');
        } else {
            slidebar.classList.add('open');
        }
    },

    renderSchemeCard: function(scheme) {
        return `
        <div class="scheme-card">
            <span class="scheme-auth-badge ${scheme.authClass}">${scheme.auth}</span>
            <h4>${scheme.name}</h4>
            <p class="scheme-benefit"><i class="fa-solid fa-circle-check"></i> ${scheme.benefit}</p>
            ${scheme.type === 'eligible' 
                ? `<p class="scheme-why"><strong>Why: </strong>${scheme.reason}</p>` 
                : `<p class="scheme-why">${scheme.desc}</p>`}
            <div class="card-actions">
                <button class="btn-save" onclick="app.openModal(${scheme.id})"><i class="fa-solid fa-circle-info"></i> Details</button>
                <button class="btn-apply" onclick="app.openModal(${scheme.id})">Apply</button>
            </div>
        </div>`;
    },

    currentSchemeId: null,

    openModal: function(schemeId) {
        const scheme = this.allSchemes.find(s => s.id === schemeId);
        if(!scheme) return;
        this.currentSchemeId = schemeId;

        document.getElementById('modal-auth-badge').className = `scheme-auth-badge ${scheme.authClass}`;
        document.getElementById('modal-auth-badge').innerText = scheme.auth;
        document.getElementById('modal-scheme-name').innerText = scheme.name;
        document.getElementById('modal-scheme-desc').innerText = scheme.desc;
        
        document.getElementById('modal-benefit').innerText = scheme.benefit;
        document.getElementById('modal-tenure').innerText = scheme.tenure || "Lifetime";
        document.getElementById('modal-official-desc').innerText = scheme.offDesc || scheme.desc;
        document.getElementById('modal-criteria').innerHTML = scheme.criteriaHtml;

        document.getElementById('scheme-modal').classList.remove('hidden');
    },

    closeModal: function() {
        document.getElementById('scheme-modal').classList.add('hidden');
        this.currentSchemeId = null;
    },

    submitApplication: async function() {
        if(!this.currentSchemeId) return;
        
        const btn = document.getElementById('modal-btn-apply');
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Submitting...`;
        btn.disabled = true;

        try {
            const formData = new URLSearchParams();
            formData.append('citizen_id', this.currentCitizenId);
            formData.append('scheme_id', this.currentSchemeId);

            const res = await fetch('/api/apply', { method: 'POST', body: formData.toString() });
            const data = await res.json();

            if (data.status === 'success') {
                this.showToast('Application successfully queued! Status: APPLIED.', 'success');
                this.closeModal();
            } else {
                this.showToast('You have already applied or an error occurred.', 'error');
            }
        } catch(e) {
            this.showToast('Network disconnected.', 'error');
        } finally {
            btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Submit Application`;
            btn.disabled = false;
        }
    },

    renderEligibleSchemes: async function() {
        const container = document.getElementById('eligible-now-container');
        container.innerHTML = '<p style="padding:2rem;">Mapping constraints in Engine...</p>';
        try {
            const res = await fetch('/api/eligibility?citizen_id=' + this.currentCitizenId);
            const eligible = await res.json();
            if(eligible.length > 0) {
                container.innerHTML = eligible.map(s => this.renderSchemeCard(s)).join('');
                this.animateCount(2, eligible.length);
            } else {
                container.innerHTML = '<p style="padding:2rem;">No new eligible schemes spotted at this time.</p>';
                this.animateCount(2, 0);
            }
        } catch(e) { 
            container.innerHTML = '<p style="color:red; padding:2rem;">Java Server Disconnected or Server Error.</p>'; 
            this.animateCount(2, 0);
        }
    },

    renderBrowseSchemes: async function() {
        try {
            const res = await fetch('/api/schemes');
            this.allSchemes = await res.json();
            const centralCt = this.allSchemes.filter(s=>s.auth==='Central Govt').length;
            const stateCt = this.allSchemes.filter(s=>s.auth!=='Central Govt').length;
            
            this.animateCount(0, centralCt);
            this.animateCount(1, stateCt);
            
            this.filterSchemes();
        } catch(e) { 
            console.error("No JSON schemes loaded"); 
            this.animateCount(0, 0);
            this.animateCount(1, 0);
        }
    },

    setFilter: function(filterTag, btnElem) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btnElem.classList.add('active');
        this.currentFilter = filterTag;
        this.filterSchemes();
    },

    filterSchemes: function() {
        const query = document.getElementById('scheme-search').value.toLowerCase();
        const container = document.getElementById('browse-schemes-container');
        
        const filtered = this.allSchemes.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(query) || s.desc.toLowerCase().includes(query);
            const matchesTag = (this.currentFilter === 'All') || (s.tags && s.tags.includes(this.currentFilter));
            return matchesSearch && matchesTag;
        });

        if(filtered.length === 0) {
            container.innerHTML = '<p style="color:#64748B; padding: 2rem;">No schemes matched your filters.</p>';
        } else {
            container.innerHTML = filtered.map(s => this.renderSchemeCard(s)).join('');
        }
    }
};
