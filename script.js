// Header scroll effect
window.addEventListener('scroll', () => {
    const header = document.querySelector('header');
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// Mobile menu toggle
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Animate elements on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animated');
        }
    });
}, observerOptions);

// Observe all cards and sections
document.querySelectorAll('.card, .section').forEach(el => {
    el.classList.add('animate-on-scroll');
    observer.observe(el);
});

// Beta signup form handler
const betaForm = document.getElementById('beta-form');
const betaSuccess = document.getElementById('beta-success');
const RECAPTCHA_SITE_KEY = '6LfI9T4sAAAAANxTvpRvO43zLwRBw_hfUJKjljDR';

if (betaForm) {
    betaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = betaForm.querySelector('input[type="email"]');
        const email = emailInput.value;
        const button = betaForm.querySelector('button');
        const originalText = button.textContent;

        button.textContent = 'Joining...';
        button.disabled = true;

        try {
            // Get reCAPTCHA token
            const recaptchaToken = await grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'signup' });

            const why = betaForm.querySelector('[name="why"]').value;

            // Client-side validation for "why" field
            if (why.length < 20) {
                throw new Error('Please tell us more about why you want CloakID (at least 20 characters).');
            }

            const response = await fetch('/.netlify/functions/signup', {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    recaptchaToken,
                    why,
                    website: betaForm.querySelector('[name="website"]').value
                }),
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (response.ok) {
                betaForm.style.display = 'none';
                const microcopy = document.querySelector('.beta-microcopy');
                if (microcopy) microcopy.style.display = 'none';
                betaSuccess.style.display = 'block';
            } else if (response.status === 429) {
                throw new Error('Too many requests. Please try again later.');
            } else {
                throw new Error(data.error || 'Signup failed');
            }
        } catch (error) {
            button.textContent = 'Try Again';
            button.disabled = false;
            alert(error.message || 'Something went wrong. Please try again or email us at support@cloakid.app');
        }
    });
}