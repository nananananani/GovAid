const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
const frontendPath = path.resolve(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Fallback to index.html for the root or unknown routes
app.get('/', (req, res) => {
    console.log('Serving index.html from:', path.join(frontendPath, 'index.html'));
    res.sendFile(path.join(frontendPath, 'index.html'));
});




app.get('/test', (req, res) => res.send('Server is alive!'));

// --- UTILS ---

const calculateAge = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

// --- AUTH ---

app.post('/api/signup', async (req, res) => {
    try {
        const { email, password, aadhaar, first_name, last_name, dob, gender, income, occupation, city, state } = req.body;
        
        // In a real app, hash password: const salt = await bcrypt.genSalt(10); const password_hash = await bcrypt.hash(password, salt);
        // For project simplicity as per their schema which uses password_hash (usually hashed)
        const password_hash = password; // Keeping it plain for now to match their existing potential DB entries or simple logic

        const sql = `INSERT INTO Citizen (email, password_hash, aadhaar_number, first_name, last_name, date_of_birth, gender, annual_income, occupation, city, state_of_residence) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        await db.execute(sql, [email, password_hash, aadhaar, first_name, last_name, dob, gender, income, occupation, city, state]);
        
        res.json({ status: 'success' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [rows] = await db.execute('SELECT citizen_id, password_hash FROM Citizen WHERE email = ?', [email]);
        
        if (rows.length > 0 && rows[0].password_hash === password) {
            res.json({ status: 'success', citizen_id: rows[0].citizen_id });
        } else {
            res.json({ status: 'error', message: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ status: 'error' });
    }
});

// --- SCHEMES & ELIGIBILITY ---

app.get('/api/schemes', async (req, res) => {
    try {
        const citizenId = req.query.citizen_id;
        let user = null;
        let age = null;

        if (citizenId) {
            const [cRows] = await db.execute('SELECT * FROM Citizen WHERE citizen_id = ?', [citizenId]);
            if (cRows.length > 0) {
                user = cRows[0];
                user.annual_income = parseFloat(user.annual_income) || 0; // CRITICAL: cast to number
                age = calculateAge(user.date_of_birth);
            }
        }


        const sql = `
            SELECT s.*, b.benefit_type, b.benefit_amount, b.benefit_description,
                   e.min_age, e.max_age, e.min_income, e.max_income, e.required_gender, e.required_occupation,
                   (SELECT GROUP_CONCAT(cat.category_name SEPARATOR ', ') 
                    FROM SchemeCategory sc 
                    JOIN Category cat ON sc.category_id = cat.category_id 
                    WHERE sc.scheme_id = s.scheme_id) as category_list
            FROM Scheme s
            LEFT JOIN Benefit b ON s.scheme_id = b.scheme_id
            LEFT JOIN EligibilityCriteria e ON s.scheme_id = e.scheme_id
            WHERE s.status = 'ACTIVE'
        `;


        const [schemes] = await db.execute(sql);
        
        const result = schemes.map(s => {
            const authId = s.authority_id;
            const benefitDesc = (s.benefit_amount && s.benefit_amount !== '0.00') ? `₹ ${s.benefit_amount}` : s.benefit_description;
            
            let is_eligible = true;
            let reason = "Profile Matched";
            const breakdown = [];
            
            if (user) {
                const check = (label, pass, detail) => {
                    breakdown.push(`${pass ? '✅' : '❌'} ${label}: ${detail}`);
                    if (!pass) is_eligible = false;
                };
                
                if (s.min_age || s.max_age) {
                    const pass = age >= (s.min_age || 0) && age <= (s.max_age || 150);
                    check("Age", pass, `${age} yrs (${(s.min_age || 0)}-${(s.max_age || 'Any')})`);
                }
                if (s.max_income) {
                    const pass = user.annual_income <= s.max_income;
                    check("Income", pass, `₹${user.annual_income} (Limit ₹${s.max_income})`);
                }
                if (s.required_gender && s.required_gender !== 'ANY') {
                    const pass = s.required_gender === user.gender;
                    check("Gender", pass, `${user.gender} (${s.required_gender} only)`);
                }
                if (s.required_occupation && s.required_occupation !== 'ANY') {
                    const userOcc = (user.occupation || "").toUpperCase();
                    const reqOcc = s.required_occupation.toUpperCase();
                    const pass = userOcc.includes(reqOcc) || reqOcc.includes(userOcc);
                    check("Occupation", pass, `${user.occupation} (Required: ${s.required_occupation})`);
                }

                if (s.authority_id === 2) {
                    const pass = user.state_of_residence.toLowerCase().includes('tamil nadu');
                    check("Residency", pass, pass ? "Tamil Nadu" : user.state_of_residence);
                }
                
                if (!is_eligible) reason = "Requirements not fully met";
            }


            return {
                id: s.scheme_id,
                name: s.scheme_name,
                auth: authId === 1 ? "Central Govt" : "Tamil Nadu Govt",
                authClass: authId === 1 ? "badge-central" : "badge-state",
                benefit: benefitDesc,
                desc: s.simplified_description,
                offDesc: s.official_description,
                tenure: s.tenure || "Lifetime",
                eligible: !!is_eligible,
                reason: reason || "Profile Matched",
                categories: s.category_list || "General",
                breakdown: breakdown,
                criteriaHtml: `<ul>
<ul>
                    <li>Age: ${s.min_age || 0} to ${s.max_age || 'Any'}</li>
                    <li>Income Limit: ${s.max_income ? '₹' + s.max_income : 'No limit'}</li>
                    ${s.required_gender && s.required_gender !== 'ANY' ? `<li>Gender: ${s.required_gender}</li>` : ''}
                    ${s.required_occupation && s.required_occupation !== 'ANY' ? `<li>Occupation: ${s.required_occupation}</li>` : ''}
                </ul>`

            };
        });

        res.json(result);
    } catch (err) {
        console.error('/api/schemes error:', err);
        res.status(500).json([]);
    }
});


app.get('/api/eligibility', async (req, res) => {
    try {
        const citizenId = req.query.citizen_id;
        const [cRows] = await db.execute('SELECT * FROM Citizen WHERE citizen_id = ?', [citizenId]);
        if (cRows.length === 0) return res.json([]);
        const user = cRows[0];
        const age = calculateAge(user.date_of_birth);
        const income = parseFloat(user.annual_income) || 0;
        const userOccUp = (user.occupation || '').toUpperCase();

        const sql = `
            SELECT s.*, b.benefit_type, b.benefit_amount, b.benefit_description,
                   e.min_age, e.max_age, e.min_income, e.max_income, e.required_gender, e.required_occupation,
                   (SELECT GROUP_CONCAT(cat.category_name SEPARATOR ', ') 
                    FROM SchemeCategory sc 
                    JOIN Category cat ON sc.category_id = cat.category_id 
                    WHERE sc.scheme_id = s.scheme_id) as category_list
            FROM Scheme s
            LEFT JOIN Benefit b ON s.scheme_id = b.scheme_id
            LEFT JOIN EligibilityCriteria e ON s.scheme_id = e.scheme_id
            WHERE s.status = 'ACTIVE'
        `;
        const [schemes] = await db.execute(sql);

        const eligible = schemes.filter(s => {
            if (s.min_age && age < s.min_age) return false;
            if (s.max_age && age > s.max_age) return false;
            if (s.max_income && income > parseFloat(s.max_income)) return false;
            if (s.required_gender && s.required_gender !== 'ANY' && s.required_gender !== user.gender) return false;
            if (s.required_occupation && s.required_occupation !== 'ANY') {
                const reqOccUp = s.required_occupation.toUpperCase();
                if (!userOccUp.includes(reqOccUp) && !reqOccUp.includes(userOccUp)) return false;
            }
            if (s.authority_id === 2 && !user.state_of_residence.toLowerCase().includes('tamil nadu')) return false;
            return true;
        }).map(s => ({
            id: s.scheme_id,
            name: s.scheme_name,
            auth: s.authority_id === 1 ? "Central Govt" : "Tamil Nadu Govt",
            authClass: s.authority_id === 1 ? "badge-central" : "badge-state",
            benefit: (s.benefit_amount && s.benefit_amount !== '0.00') ? `₹ ${s.benefit_amount}` : s.benefit_description,
            desc: s.simplified_description,
            offDesc: s.official_description,
            tenure: s.tenure || "Lifetime",
            eligible: true,
            reason: "Profile Matched",
            categories: s.category_list || "General",
            criteriaHtml: `<ul>
                <li>Age Limit: ${s.min_age || 0} to ${s.max_age || 'Any'}</li>
                <li>Max Income: ${s.max_income ? '₹' + s.max_income : 'No limit'}</li>
            </ul>`
        }));

        res.json(eligible);
    } catch (err) {
        console.error('/api/eligibility error:', err);
        res.status(500).json([]);
    }
});




app.get('/api/categories', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM Category ORDER BY category_name');
        res.json(rows);
    } catch (err) {
        res.status(500).json([]);
    }
});

app.get('/api/life-events', async (req, res) => {
    try {
        const citizenId = req.query.citizen_id;
        let user = null;
        let age = null;
        if (citizenId) {
            const [cRows] = await db.execute('SELECT * FROM Citizen WHERE citizen_id = ?', [citizenId]);
            if (cRows.length > 0) { user = cRows[0]; age = calculateAge(user.date_of_birth); }
        }

        const sql = `
            SELECT le.life_event_id, le.event_name, le.event_description,
                   GROUP_CONCAT(s.scheme_id) as scheme_ids
            FROM LifeEvent le
            LEFT JOIN SchemeLifeEvent sle ON le.life_event_id = sle.life_event_id
            LEFT JOIN Scheme s ON sle.scheme_id = s.scheme_id AND s.status = 'ACTIVE'
            GROUP BY le.life_event_id
        `;
        const [events] = await db.execute(sql);
        res.json(events.map(e => ({
            id: e.life_event_id,
            name: e.event_name,
            description: e.event_description,
            scheme_ids: e.scheme_ids ? e.scheme_ids.split(',').map(Number) : []
        })));
    } catch (err) {
        console.error(err);
        res.status(500).json([]);
    }
});

app.get('/api/profile', async (req, res) => {
    try {
        const citizenId = req.query.citizen_id;
        const sql = `
            SELECT c.*, (SELECT COUNT(*) FROM CitizenSchemeSelection WHERE citizen_id = ?) as applied_count
            FROM Citizen c WHERE citizen_id = ?
        `;
        const [rows] = await db.execute(sql, [citizenId, citizenId]);
        if (rows.length > 0) {
            const u = rows[0];
            res.json({
                first_name: u.first_name,
                last_name: u.last_name,
                email: u.email,
                aadhaar_number: u.aadhaar_number,
                date_of_birth: u.date_of_birth,
                gender: u.gender,
                occupation: u.occupation,
                annual_income: parseFloat(u.annual_income) || 0,
                state_of_residence: u.state_of_residence,
                state: u.state_of_residence, // alias for frontend
                city: u.city || '',
                contact_number: u.contact_number || '',
                pincode: u.pincode || '',
                applied_count: u.applied_count
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }

    } catch (err) {
        console.error('Profile fetch error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


app.post('/api/apply', async (req, res) => {
    try {
        const { citizen_id, scheme_id } = req.body;
        const sql = `INSERT INTO CitizenSchemeSelection (citizen_id, scheme_id, application_date, status_id) 
                     VALUES (?, ?, CURDATE(), 1)`;
        await db.execute(sql, [citizen_id, scheme_id]);
        res.json({ status: 'success' });
    } catch (err) {
        res.json({ status: 'error', message: 'Already applied or error' });
    }
});

app.get('/api/applications', async (req, res) => {
    try {
        const citizenId = req.query.citizen_id;
        const sql = `
            SELECT css.*, s.scheme_name, s.authority_id, ast.status_name
            FROM CitizenSchemeSelection css
            JOIN Scheme s ON css.scheme_id = s.scheme_id
            JOIN ApplicationStatus ast ON css.status_id = ast.status_id
            WHERE css.citizen_id = ?
            ORDER BY css.application_date DESC
        `;
        const [rows] = await db.execute(sql, [citizenId]);
        res.json(rows.map(r => ({
            id: r.selection_id,
            scheme_name: r.scheme_name,
            date: r.application_date,
            status: r.status_name,
            auth: r.authority_id === 1 ? "Central" : "State"
        })));
    } catch (err) {
        res.status(500).json([]);
    }
});



// ============================================================
// ADMIN ROUTES
// ============================================================

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin';

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        res.json({ status: 'success', token: 'admin-session-token' });
    } else {
        res.status(401).json({ status: 'error', message: 'Invalid admin credentials' });
    }
});

app.get('/api/admin/stats', async (req, res) => {
    try {
        const [[{ totalCitizens }]] = await db.execute('SELECT COUNT(*) as totalCitizens FROM Citizen');
        const [[{ totalApplications }]] = await db.execute('SELECT COUNT(*) as totalApplications FROM CitizenSchemeSelection');
        const [[{ totalSchemes }]] = await db.execute("SELECT COUNT(*) as totalSchemes FROM Scheme WHERE status = 'ACTIVE'");
        const [[{ pendingApplications }]] = await db.execute("SELECT COUNT(*) as pendingApplications FROM CitizenSchemeSelection WHERE status_id = 1");

        // Gender distribution
        const [genderRows] = await db.execute('SELECT gender, COUNT(*) as count FROM Citizen GROUP BY gender');

        // Occupation distribution
        const [occupationRows] = await db.execute('SELECT occupation, COUNT(*) as count FROM Citizen GROUP BY occupation ORDER BY count DESC LIMIT 6');

        // Most applied schemes
        const [topSchemes] = await db.execute(`
            SELECT s.scheme_name, COUNT(css.scheme_id) as applications
            FROM CitizenSchemeSelection css
            JOIN Scheme s ON css.scheme_id = s.scheme_id
            GROUP BY css.scheme_id ORDER BY applications DESC LIMIT 5
        `);

        // Applications by status
        const [statusRows] = await db.execute(`
            SELECT ast.status_name, COUNT(*) as count
            FROM CitizenSchemeSelection css
            JOIN ApplicationStatus ast ON css.status_id = ast.status_id
            GROUP BY css.status_id
        `);

        // Applications over time (last 7 entries)
        const [timeRows] = await db.execute(`
            SELECT DATE_FORMAT(application_date, '%d %b') as day, COUNT(*) as count
            FROM CitizenSchemeSelection
            GROUP BY application_date ORDER BY application_date DESC LIMIT 7
        `);

        res.json({
            totalCitizens, totalApplications, totalSchemes, pendingApplications,
            genderDistribution: genderRows,
            occupationDistribution: occupationRows,
            topSchemes,
            applicationsByStatus: statusRows,
            applicationsOverTime: timeRows.reverse()
        });
    } catch (err) {
        console.error('Admin stats error:', err);
        res.status(500).json({});
    }
});

app.get('/api/admin/citizens', async (req, res) => {
    try {
        const search = req.query.search || '';
        const sql = `
            SELECT c.citizen_id, c.first_name, c.last_name, c.email, c.gender,
                   c.occupation, c.annual_income, c.state_of_residence, c.city,
                   c.date_of_birth,
                   (SELECT COUNT(*) FROM CitizenSchemeSelection WHERE citizen_id = c.citizen_id) as applications
            FROM Citizen c
            WHERE c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR c.aadhaar_number LIKE ?
            ORDER BY c.citizen_id DESC
        `;
        const q = `%${search}%`;
        const [rows] = await db.execute(sql, [q, q, q, q]);
        res.json(rows.map(r => ({
            ...r,
            annual_income: parseFloat(r.annual_income) || 0,
            full_name: `${r.first_name} ${r.last_name}`
        })));
    } catch (err) {
        console.error('Admin citizens error:', err);
        res.status(500).json([]);
    }
});

app.get('/api/admin/applications', async (req, res) => {
    try {
        const sql = `
            SELECT css.selection_id, css.application_date, css.citizen_id,
                   c.first_name, c.last_name,
                   s.scheme_name, s.authority_id,
                   ast.status_name, ast.status_id
            FROM CitizenSchemeSelection css
            JOIN Citizen c ON css.citizen_id = c.citizen_id
            JOIN Scheme s ON css.scheme_id = s.scheme_id
            JOIN ApplicationStatus ast ON css.status_id = ast.status_id
            ORDER BY css.application_date DESC
        `;
        const [rows] = await db.execute(sql);
        res.json(rows.map(r => ({
            id: r.selection_id,
            citizen_name: `${r.first_name} ${r.last_name}`,
            citizen_id: r.citizen_id,
            scheme_name: r.scheme_name,
            authority: r.authority_id === 1 ? 'Central Govt' : 'Tamil Nadu Govt',
            date: r.application_date,
            status: r.status_name,
            status_id: r.status_id
        })));
    } catch (err) {
        console.error('Admin applications error:', err);
        res.status(500).json([]);
    }
});

app.put('/api/admin/applications/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status_id } = req.body;
        await db.execute('UPDATE CitizenSchemeSelection SET status_id = ? WHERE selection_id = ?', [status_id, id]);
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ status: 'error' });
    }
});


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`GovAid Backend running on http://localhost:${PORT}`);
});
