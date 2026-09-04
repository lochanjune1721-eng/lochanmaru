// ============================================
// LANDING PAGE - WHO'S WATCHING
// ============================================
document.addEventListener('DOMContentLoaded', function () {
    const clickOverlay = document.getElementById('click-overlay'); // Unused now
    const introAnimation = document.getElementById('intro-animation');
    const landingScreen = document.getElementById('landing-screen');
    const mainSite = document.getElementById('main-site');
    const profileCards = document.querySelectorAll('.profile-card');
    const audio = document.getElementById('netflix-sound');
    const heroVideo = document.getElementById('hero-video');

    // 1. Manual Start Sequence (Logo + Play Button)
    const introBtn = document.getElementById('intro-play-btn');

    try {
        console.log("Ready for Intro...");

        // Show Intro (Static)
        if (introAnimation) {
            introAnimation.style.display = 'flex';
            introAnimation.style.opacity = '1';
            introAnimation.style.visibility = 'visible';
            introAnimation.classList.add('active');
            introAnimation.classList.add('active');
            // Static Name on Load
            introAnimation.classList.remove('play'); // Wait for Zoom Trigger
        }

        // Hide Landing Screen
        if (landingScreen) {
            landingScreen.classList.remove('active');
            landingScreen.style.display = 'none';
        }

        // Handle Play Click
        if (introBtn) {
            introBtn.addEventListener('click', () => {
                console.log("Starting Intro...");
                introBtn.style.display = 'none'; // Hide button
                introBtn.style.display = 'none'; // Hide button

                // Restart Animation
                introAnimation.classList.remove('appear');
                void introAnimation.offsetWidth; // Trigger reflow
                introAnimation.classList.add('appear');

                introAnimation.classList.add('play'); // Start Animation Zoom

                // Play Audio
                const tadum = new Audio('Netflix_New_Logo_Animation_2019_128k.mp3');
                tadum.volume = 1.0;
                tadum.play().catch(e => console.error("Audio failed:", e));

                // Transition to Who's Watching after 3.5s
                setTimeout(() => {
                    introAnimation.classList.remove('active');
                    setTimeout(() => {
                        introAnimation.style.display = 'none';
                        // Show Who's Watching
                        landingScreen.style.display = 'flex';
                        landingScreen.style.opacity = '0';
                        // Small delay for transition
                        setTimeout(() => {
                            landingScreen.classList.add('active');
                            landingScreen.style.opacity = '1';
                            landingScreen.style.visibility = 'visible';
                        }, 50);
                    }, 500);
                }, 3500);
            });
        }

    } catch (e) {
        console.error("Init logic error:", e);
    }

    // Loop Video between 8s and 18s
    if (heroVideo) {
        heroVideo.addEventListener('timeupdate', function () {
            if (this.currentTime >= 18) {
                this.currentTime = 8;
                this.play();
            }
        });
    }

    // 2. Handle profile card clicks -> Main Site (Intro already played)
    profileCards.forEach(card => {
        card.addEventListener('click', function () {
            // Hide "Who's Watching"
            landingScreen.classList.remove('active');
            setTimeout(() => landingScreen.style.display = 'none', 500);

            // Show Main Site Immediately
            mainSite.classList.add('active');

            // Trigger Hero Content Animation
            const heroContent = document.querySelector('.hero-content');
            if (heroContent) {
                setTimeout(() => heroContent.classList.add('active'), 100);
            }

            // Play Background Video
            if (heroVideo) {
                heroVideo.currentTime = 8;
                heroVideo.play().catch(console.error);
            }
            document.body.style.overflow = 'auto'; // Enable scrolling
        });
    });

    // ============================================
    // SMOOTH SCROLLING FOR NAVBAR LINKS
    // ============================================
    const navLinks = document.querySelectorAll('.nav-links a, .hero-cta, .mobile-bottom-nav a');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');

            if (href.startsWith('#')) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetSection = document.getElementById(targetId);

                if (targetSection) {
                    targetSection.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // ============================================
    // JOURNEY SECTION - YEAR CARDS
    // ============================================
    const journeyCards = document.querySelectorAll('.journey-card');
    const journeyModal = document.getElementById('journey-modal');
    const modalBody = document.getElementById('modal-body');
    const modalClose = document.getElementById('modal-close');

    // Journey data with all content
    const journeyData = {
        'saasflash': {
            title: 'SaasFlash - Creative Director',
            subtitle: 'Leading Teams & Scaling Brands',
            description: `<p><strong>Starting point:</strong> ~30,000 followers<br><strong>Ambition:</strong> Become the most premium tech content agency, not just another growth page</p><p>When I joined SaaSFlash, the page was already “good.” Editing quality was high, topics were relevant, and the team clearly cared about the product. But that was also the problem - it looked like every other good tech page.</p><p>What was missing was point of view.</p><p>The founders didn’t want SaaSFlash to be a meme page or a repurposing machine. They wanted clients to look at the page and think: “These people actually understand tech at a deep level.”</p><p>So my role naturally became less about volume and more about raising the intellectual ceiling of the content. I went deep into tech discourse: SaaS, startups, AI, infra, founders, distribution. Instead of summarizing news, I focused on:</p><ul><li>Why a trend exists</li><li>What people are misunderstanding</li><li>What this says about where tech is headed</li></ul><p>Every trending topic had to earn its place. If we covered it, it needed a clear POV, not just information. I wrote nuanced scripts that assumed the audience was smart and curious, not passive.</p><p>Several of the videos I wrote became the most viral pieces on the page, but more importantly, they shaped SaaSFlash’s identity. The page started feeling premium, opinionated, and thoughtful.</p><p>That positioning paid off beyond views. Clients started coming in because of the page itself. SaaSFlash closed 5–6 high-quality clients using the content as proof that they weren’t just editors - they were thinkers.</p>`,
            tweet: `<blockquote class="twitter-tweet" data-theme="dark"><a href="https://twitter.com/shiri_shh/status/2007137787359965423"></a></blockquote>`,
            videos: [
                'https://www.instagram.com/reel/DS5Aq6NDIIS/embed',
                'https://www.instagram.com/reel/DSuwrrKDLmw/embed',
                'https://www.instagram.com/reel/DPHjYATEp1t/embed',
                'https://www.instagram.com/reel/DN6FoIzD8ux/embed',
                'https://www.instagram.com/reel/DMQp_KYsVxH/embed',
                'https://www.instagram.com/reel/DLsgQ1rMALV/embed',
                'https://www.instagram.com/reel/DKAL5w3sD3k/embed'
            ],
            projects: [
                {
                    name: 'Perplexity',
                    description: 'AI search content',
                    videos: [
                        'https://www.instagram.com/p/DMGfUj6pesc/embed'
                    ]
                },
                {
                    name: 'Greg Isenberg',
                    description: 'Startup strategy',
                    videos: [
                        'https://www.instagram.com/p/DKx942YJCeN/embed',
                        'https://www.instagram.com/p/DNOMZ4pRntv/embed',
                        'https://www.instagram.com/p/DMXv8TgME7M/embed'
                    ]
                },
                {
                    name: 'Den Donovan',
                    description: 'Creator economy',
                    videos: [
                        'https://www.instagram.com/p/DOoFeiUkyzz/embed',
                        'https://www.instagram.com/p/DOJGupBkv79/embed',
                        'https://www.instagram.com/p/DMxYM4Vx76c/embed'
                    ]
                }
            ]
        },
        'juneandlochan': {
            title: 'June & Lochan',
            subtitle: 'Creator & Builder',
            description: `<p><strong>Personal project:</strong> 0 → 400K in under 6 month</p><p>This was deeply personal. I’d always wanted to talk about India - its politics, systems, contradictions - but I never wanted to be the face of the page. I was already overloaded with work and more comfortable behind the scenes.</p><p>So my girlfriend became the face, and I handled everything else: positioning, ideation, scripting.</p><p>We focused on topics people were already emotionally invested in, but framed them thoughtfully instead of sensationally. The response was immediate. The page hit 50,000 followers in under a month, proving that the ideas resonated when packaged correctly.</p>`,
            videos: [
                'https://www.instagram.com/reel/DTozi9KgVN7/embed',
                'https://www.instagram.com/reel/DSW4HSBAX7i/embed'
            ]
        },
        'survivingai': {
            title: 'Surviving AI',
            subtitle: 'AI Media',
            description: `Decoding the future of Artificial Intelligence for the masses. Making complex tech accessible.`,
            videos: [
                'https://www.instagram.com/reel/DSNVudxj3uF/embed',
                'https://www.instagram.com/p/DQ62JwGj6Gr/embed'
            ]
        },
        'beyonddegree': {
            title: 'Beyond Degree',
            subtitle: 'EdTech Media',
            description: `<p><strong>First video:</strong> ~1.5M views</p><p>This project mattered because it aligned with my own beliefs. Marwadi University wanted an education page. I didn’t want to build another “degree = success” account. Instead, I positioned Beyond Degree around everything formal education doesn’t teach - skills, curiosity, and learning through real-world exposure.</p><p>I took inspiration from pages like Sei Com Sei, but added humor and cultural context. The very first video crossed ~1.5 million views, instantly validating the positioning.</p>`,
            videos: [
                'https://www.instagram.com/reel/DMIQRbaMH9b/embed',
                'https://www.instagram.com/reel/DQotgn-gS63/embed'
            ]
        },
        '2024': {
            title: '2024 - Breaking into FinTech',
            subtitle: 'Yaas (Varun Mayya\'s Company) - Content Strategist',
            description: 'Turning complex finance into simple stories.',
            projects: [
                {
                    name: 'Markets by Zerodha',
                    growth: '30K → 100K subscribers',
                    strategy: 'Simplify trading for beginners',
                    videos: [
                        'https://www.youtube.com/embed/gLpyaHLuQVo',
                        'https://www.youtube.com/embed/Kf0SV7aZXfI'
                    ]
                },
                {
                    name: 'Binge Wealth',
                    growth: '20K → 150K followers',
                    strategy: 'Financial storytelling meets lifestyle',
                    videos: [
                        'https://www.instagram.com/p/DFIYngSzJhb/embed',
                        'https://www.instagram.com/p/DDZiMrJTW-J/embed'
                    ]
                }
            ]
        },
        '2023-24': {
            title: '2023-24 - Scaling EdTech Brands',
            subtitle: 'Brand Flow Media - Content Strategist',
            description: `Worked with India's biggest EdTech names: GeeksforGeeks, Sahil Gogna, Kodnest, Coding Ninjas, PhysicsWallah`,
            projects: [
                {
                    name: 'GeeksforGeeks',
                    problem: 'Weak hooks, no trends, no personality',
                    solution: 'Trend analysis, script hooks, storytelling',
                    videos: [
                        'https://www.youtube.com/embed/cC8MjoYGedk',
                        'https://www.youtube.com/embed/9yBY0BOZhUE',
                        'https://www.youtube.com/embed/jOMxKsUd6e0',
                        'https://www.youtube.com/embed/tiFIf_nUCZc',
                        'https://www.youtube.com/embed/wn0btNJ65ws'
                    ]
                },
                {
                    name: 'Sahil Gogna',
                    growth: '480 → 150K followers',
                    videos: [
                        'https://www.instagram.com/p/C4LNOdOOVg4/embed',
                        'https://www.youtube.com/embed/V1g3Ms4bRgc'
                    ]
                }
            ]
        },
        '2023': {
            title: '2023 - Fix Health',
            subtitle: 'Product Manager & Content Writer',
            description: `First exposure to conversion-focused content and community management.`,
            videos: [
                'https://www.youtube.com/embed/O_h6jEXRtUY'
            ]
        },
        '2021': {
            title: '2021 - The Beginning',
            subtitle: 'National Institute of Technology, Karnataka',
            description: `During the pandemic, college went online - I saw an opportunity to connect people. Created NIT Mechanics.`,
            videos: [
                'https://www.youtube.com/embed/8uRB1bVhKJQ'
            ]
        }
    };

    // Function to generate video HTML
    function generateVideoHTML(url) {
        return `<div class="video-item"><iframe src="${url}" allowfullscreen loading="lazy"></iframe></div>`;
    }

    // Function to generate journey modal content
    function generateJourneyContent(year) {
        const data = journeyData[year];
        if (!data) return '';

        let html = `
            <div class="modal-header">
                <h2 class="modal-title">${data.title}</h2>
                <p class="modal-subtitle">${data.subtitle}</p>
            </div>
        `;

        if (data.description) {
            html += `
                <div class="modal-section">
                    <h3>Overview</h3>
                    <p>${data.description}</p>
                </div>
            `;
        }

        // Media Gallery (Tweet + Videos)
        if (data.tweet || (data.videos && data.videos.length > 0)) {
            html += `<div class="modal-section">`;

            // Tweet
            if (data.tweet) {
                html += `
                    <div style="display: flex; justify-content: center; margin-bottom: 2rem; width: 100%;">
                        ${data.tweet}
                    </div>
                `;
            }

            // Videos
            if (data.videos && data.videos.length > 0) {
                html += `
                    <div class="video-grid">
                        ${data.videos.map(video => generateVideoHTML(video)).join('')}
                    </div>
                `;
            }

            html += `</div>`;
        }

        // Extra details (responsibilities, etc.) 
        // (Assuming existing structure is fine for now, user didn't request changes here)

        if (data.projects) {
            data.projects.forEach(project => {
                html += `<div class="modal-section">`;
                html += `<h3>${project.name}</h3>`;

                if (project.description) {
                    html += `<p>${project.description}</p>`;
                }
                if (project.growth) {
                    html += `<p style="color: #4ade80; font-weight: 600;">Growth: ${project.growth}</p>`;
                }
                if (project.strategy) {
                    html += `<p><strong>Strategy:</strong> ${project.strategy}</p>`;
                }
                if (project.problem) {
                    html += `<p><strong>Problems:</strong> ${project.problem}</p>`;
                }
                if (project.solution) {
                    html += `<p><strong>Solutions:</strong> ${project.solution}</p>`;
                }

                if (project.videos && project.videos.length > 0) {
                    html += `<div class="video-grid">`;
                    project.videos.forEach(video => {
                        html += generateVideoHTML(video);
                    });
                    html += `</div>`;
                }

                html += `</div>`;
            });
        }

        return html;
    }

    // Handle journey card clicks
    journeyCards.forEach(card => {
        card.addEventListener('click', function () {
            const year = this.getAttribute('data-year');
            const content = generateJourneyContent(year);

            modalBody.innerHTML = content;
            journeyModal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent background scroll

            // Reload Twitter widgets if present
            if (window.twttr) {
                window.twttr.widgets.load();
            }
        });
    });

    // Close journey modal
    modalClose.addEventListener('click', function () {
        journeyModal.classList.remove('active');
        document.body.style.overflow = 'auto'; // Restore scrolling
    });

    journeyModal.addEventListener('click', function (e) {
        if (e.target === journeyModal) {
            journeyModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });

    // ============================================
    // PROJECT SECTION - PROJECT CARDS
    // ============================================
    const projectCards = document.querySelectorAll('.project-card');
    const projectModal = document.getElementById('project-modal');
    const projectModalBody = document.getElementById('project-modal-body');
    const projectModalClose = document.getElementById('project-modal-close');

    // Project data
    const projectData = {
        'saasflash': {
            name: 'SaasFlash',
            image: 'assets/saasflash1.png',
            growth: '30K → 115K',
            role: 'Creative Director',
            description: `<p><strong>Starting point:</strong> ~30,000 followers<br><strong>Ambition:</strong> Become the most premium tech content agency, not just another growth page</p><p>When I joined SaaSFlash, the page was already “good.” Editing quality was high, topics were relevant, and the team clearly cared about the product. But that was also the problem - it looked like every other good tech page.</p><p>What was missing was point of view.</p><p>The founders didn’t want SaaSFlash to be a meme page or a repurposing machine. They wanted clients to look at the page and think: “These people actually understand tech at a deep level.”</p><p>So my role naturally became less about volume and more about raising the intellectual ceiling of the content. I went deep into tech discourse: SaaS, startups, AI, infra, founders, distribution. Instead of summarizing news, I focused on:</p><ul><li>Why a trend exists</li><li>What people are misunderstanding</li><li>What this says about where tech is headed</li></ul><p>Every trending topic had to earn its place. If we covered it, it needed a clear POV, not just information. I wrote nuanced scripts that assumed the audience was smart and curious, not passive.</p><p>Several of the videos I wrote became the most viral pieces on the page, but more importantly, they shaped SaaSFlash’s identity. The page started feeling premium, opinionated, and thoughtful.</p><p>That positioning paid off beyond views. Clients started coming in because of the page itself. SaaSFlash closed 5–6 high-quality clients using the content as proof that they weren’t just editors - they were thinkers.</p>`,
            metrics: [
                '10M+ Views from 12 Videos',
                'Managing team of 8 writers & 20 editors',
                'Scaled SaasFlash from 30K to 100K'
            ],
            videos: [
                'https://www.instagram.com/p/DPHjYATEp1t/embed',
                'https://www.instagram.com/p/DN6FoIzD8ux/embed',
                'https://www.instagram.com/p/DMQp_KYsVxH/embed',
                'https://www.instagram.com/p/DLsgQ1rMALV/embed',
                'https://www.instagram.com/p/DKAL5w3sD3k/embed'
            ]
        },
        'greg': {
            name: 'Greg Isenberg',
            image: 'assets/greg1.png',
            growth: '15K → 78K',
            role: 'Writer / Strategist',
            description: `<p><strong>Starting point:</strong> ~15,000 Instagram followers<br><strong>Constraint:</strong> Grow Instagram without Greg being involved</p><p>Greg was already massive on Twitter and YouTube. Instagram was the outlier. He wanted growth there, but without recording content, hopping on calls, or managing the page himself.</p><p>So I treated Instagram like a systems problem, not a creator problem.</p><p>First, I studied his entire body of work: Twitter threads to understand how he frames ideas, YouTube videos to understand pacing and depth, His recurring mental models around startups, community, and leverage.</p><p>Then I asked two questions: What already works that we can adapt? What Instagram-native content is missing?</p><p>I built a pipeline where ideas were extracted from Twitter and YouTube, rewritten specifically for Instagram behavior, and turned into motion-first videos. For voice, we used 11Labs, so Greg never had to record anything.</p><p>I handled scripting end-to-end. I’d send Greg batches of five scripts, he’d leave comments, I’d refine them, move them into production, review edits, and then share v1 cuts for final input.</p><p>This wasn’t random experimentation - it was structured iteration. One of the videos I wrote became the most viral video on his Instagram page. Over time, the page grew from ~15K to ~80K followers, and Instagram became a real extension of his brand rather than an afterthought.</p>`,
            metrics: [
                '10M+ Views from 12 Videos',
                'Grew from 15K to 60K followers',
                'Viral Instagram reels'
            ],
            videos: [
                'https://www.instagram.com/p/DKx942YJCeN/embed',
                'https://www.instagram.com/p/DNOMZ4pRntv/embed',
                'https://www.instagram.com/p/DMXv8TgME7M/embed'
            ]
        },
        'den': {
            name: 'Den Donovan',
            image: 'assets/den.png',
            growth: '20 Million+ Views',
            role: 'Content Director',
            description: `<p><strong>Initial brief:</strong> Tech content<br><strong>Reality:</strong> Audience mismatch</p><p>Den initially wanted to create tech content. On paper, it made sense. But after publishing a few videos, I noticed something important: his audience didn’t care.</p><p>His audience was largely Dubai/UAE-based, and generic tech takes weren’t resonating at all. Instead of forcing the strategy, I paused and re-evaluated the audience itself.</p><p>The insight was simple: Den didn’t need to be a tech creator. He needed to be a Dubai thought leader.</p><p>We completely shifted positioning. Instead of tech-first content, we focused on: How Dubai works, Politics and governance, Why certain systems succeed, Cultural and economic insights.</p><p>Once the page had a clear identity, everything changed. Videos started crossing millions of views, with some touching 5 million+. The audience finally felt like the content was speaking to them, not at them.</p><p>This project taught me how important audience-context is - even the best ideas fail if they’re aimed at the wrong people.</p>`,
            metrics: [
                'Grew from 70K to 80K followers',
                'Creator economy focus',
                'Educational content'
            ],
            videos: [
                'https://www.instagram.com/p/DOoFeiUkyzz/embed',
                'https://www.instagram.com/p/DOJGupBkv79/embed',
                'https://www.instagram.com/p/DMxYM4Vx76c/embed'
            ]
        },
        'evolving': {
            name: 'Evolving AI',
            image: 'assets/evolving.png',
            growth: '5M+ Views',
            role: 'Content Lead',
            description: `<p><strong>Situation:</strong> Already viral, but shallow</p><p>Evolving AI already had reach. The founder’s feedback was clear: “The content works, but it lacks nuance.”</p><p>My job here wasn’t reinvention - it was depth injection.</p><p>I kept the same formats and viral mechanics, but rewrote scripts to: Add clearer arguments, Avoid hype-only framing, Explain tradeoffs instead of promises.</p><p>Essentially, I brought the same nuanced thinking I was using at SaaSFlash, but adapted it to an audience that was already paying attention.</p>`,
            metrics: [
                '5M+ Views from 8 Videos',
                'Making complex tech accessible',
                'Viral AI Narratives'
            ],
            videos: [
                'https://www.instagram.com/p/DNGciXsN3ur/embed',
                'https://www.instagram.com/p/DQMcbqik1QX/embed'
            ]
        },
        'matic': {
            name: 'Matic',
            image: 'assets/matic.svg',
            growth: '10M+ Views',
            role: 'Launch Copy & Distribution',
            description: `<p><strong>Brief:</strong> Launch AI-powered humanoid robots to an audience that doesn't follow robotics</p><p>The hard part of this launch was never the technology. It was making physical-world autonomy legible - a robot that operates in real, messy spaces rather than a demo rig on a stage.</p><p>So the copy led with what the robot actually does in a home, and let the autonomy claim be the conclusion the reader arrives at, not the opening line. Spec-first framing would have narrowed the audience to people who were already convinced.</p><p>The launch copy was then paired with a set of influencer distribution posts written to travel independently of the announcement itself. Together they drove <strong>10M+ views</strong>.</p>`,
            metrics: [
                '10M+ views across launch and distribution',
                'Launch copy for AI-powered humanoid robots',
                'Positioned physical-world autonomy for a mainstream audience'
            ],
            tweet: `<blockquote class="twitter-tweet" data-theme="dark"><a href="https://twitter.com/maticrobots/status/2087962897267990915"></a></blockquote>`
        },
        'fishaudio': {
            name: 'Fish Audio',
            image: 'assets/fishaudio.svg',
            growth: '5M+ Impressions',
            role: 'Launch Copy & Distribution',
            description: `<p><strong>Brief:</strong> Launch the S2 voice model</p><p>Voice model launches usually collapse into benchmark talk. The interesting thing about S2 wasn't a number - it was that the voice was both expressive and controllable, which are usually a tradeoff.</p><p>I built the launch copy around that tension: you can direct the performance, not just generate audio. That gave the announcement a claim people could actually hear the difference in.</p><p>Influencer distribution posts carried the same idea outward and generated <strong>5M+ impressions</strong>.</p>`,
            metrics: [
                '5M+ impressions from distribution posts',
                'Launch copy for the S2 voice model',
                'Framed expressive + controllable voice generation as one claim'
            ],
            tweet: `<blockquote class="twitter-tweet" data-theme="dark"><a href="https://twitter.com/FishAudio/status/2082152596739862853"></a></blockquote>`
        },
        'playerzero': {
            name: 'PlayerZero',
            image: 'assets/playerzero.svg',
            growth: '2.7M+ Impressions',
            role: 'Launch Copy',
            description: `<p><strong>Brief:</strong> Position AI-powered software testing</p><p>"AI for testing" is a crowded, low-signal category. Every tool in it says the same thing.</p><p>The sharper story was what PlayerZero does with the tests: it autonomously finds critical production issues - the bugs that are already costing you, not hypothetical coverage gaps.</p><p>Writing the launch around found production issues rather than testing capability gave the product a concrete, checkable promise. The launch generated <strong>2.7M+ impressions</strong>.</p>`,
            metrics: [
                '2.7M+ impressions',
                'Launch copy for AI-powered software testing',
                'Positioned around autonomously finding critical production issues'
            ],
            tweet: `<blockquote class="twitter-tweet" data-theme="dark"><a href="https://twitter.com/akoratana/status/2036111467016319074"></a></blockquote>`
        },
        'polyai': {
            name: 'PolyAI',
            image: 'assets/polyai.svg',
            growth: '3.4M+ Impressions',
            role: 'Launch Copy',
            description: `<p><strong>Brief:</strong> Turn complex enterprise voice AI into something people can repeat</p><p>Enterprise voice AI is a category that explains itself badly. The buyer understands it; nobody else does, so the story stops at the buyer.</p><p>I cut the launch copy down to one clear idea: AI agents handling real customer conversations - not IVR trees, not deflection, actual conversations that resolve.</p><p>Keeping the claim concrete let a technical enterprise product travel on a consumer-shaped feed. It generated <strong>3.4M+ impressions</strong>.</p>`,
            metrics: [
                '3.4M+ impressions',
                'Launch copy for enterprise voice AI',
                'Reframed the product around AI agents handling real customer conversations'
            ],
            tweet: `<blockquote class="twitter-tweet" data-theme="dark"><a href="https://twitter.com/polyaivoice/status/2023789465509015972"></a></blockquote>`
        },
        'wisprflow': {
            name: 'Wispr Flow',
            image: 'assets/wisprflow.svg',
            growth: 'Launch Campaign',
            role: 'Launch Copy',
            description: `<p><strong>Brief:</strong> Launch copy for Wispr Flow</p><p>Wispr Flow turns speech into written text anywhere you already type. The temptation with a product like this is to sell the speech model; the actual shift is behavioural - dictation stops being a fallback and becomes the default way you write.</p><p>The launch copy stayed on that behavioural change rather than the underlying models, and ran from the founder's account.</p>`,
            metrics: [
                'Launch copy for the Wispr Flow launch',
                'Founder-led launch post',
                'Positioned voice as a default input, not an accessibility fallback'
            ],
            tweet: `<blockquote class="twitter-tweet" data-theme="dark"><a href="https://twitter.com/tankots/status/2025981424470479008"></a></blockquote>`
        },
        'personal': {
            name: 'June & Lochan',
            image: 'assets/june.png',
            growth: '0 → 300k (4 month)',
            role: 'Creator',
            description: `<p><strong>Personal project:</strong> 0 → 50K in under a month</p><p>This was deeply personal. I’d always wanted to talk about India - its politics, systems, contradictions - but I never wanted to be the face of the page. I was already overloaded with work and more comfortable behind the scenes.</p><p>So my girlfriend became the face, and I handled everything else: positioning, ideation, scripting.</p><p>We focused on topics people were already emotionally invested in, but framed them thoughtfully instead of sensationally. The response was immediate. The page hit 50,000 followers in under a month, proving that the ideas resonated when packaged correctly.</p><br><a href="https://www.instagram.com/juneandlochan/" target="_blank" style="color: #e50914; text-decoration: none; font-weight: bold;">View on Instagram &rarr;</a>`,
            metrics: [
                'Grew from 0 to 300K in just 4 month',
                'Personal brand storytelling',
                'Authentic creative content'
            ],
            videos: [
                'https://www.instagram.com/reel/DTozi9KgVN7/embed',
                'https://www.instagram.com/reel/DTqDpAVgX3D/embed'
            ]
        },
        'beyond': {
            name: 'Beyond Degree',
            image: 'assets/beyond.png',
            growth: '0 → 30K Views',
            role: 'Founder',
            description: `<p><strong>First video:</strong> ~1.5M views</p><p>This project mattered because it aligned with my own beliefs. Marwadi University wanted an education page. I didn’t want to build another “degree = success” account. Instead, I positioned Beyond Degree around everything formal education doesn’t teach - skills, curiosity, and learning through real-world exposure.</p><p>I took inspiration from pages like Sei Com Sei, but added humor and cultural context. The very first video crossed ~1.5 million views, instantly validating the positioning.</p><br><a href="https://www.instagram.com/beyonddegree.ig/" target="_blank" style="color: #e50914; text-decoration: none; font-weight: bold;">View on Instagram &rarr;</a>`,
            metrics: [
                'Building an EdTech media brand',
                'Focus on student narratives',
                'Innovative content formats'
            ],
            videos: [
                'https://www.instagram.com/reel/DMIQRbaMH9b/embed',
                'https://www.instagram.com/reel/DQotgn-gS63/embed',
                'https://www.instagram.com/reel/DSQVeHxk90s/embed'
            ]
        },
        'keshav': {
            name: 'Keshav Grower',
            image: 'assets/keshav.png',
            growth: '15K → 142K',
            role: 'Marketing Manager',
            description: `<p><strong>From company page to personal brand</strong></p><p>Keshav initially hired me to grow his company page. Once results came in, he asked me to work on his personal brand as well.</p><p>I noticed a gap no one was serving properly: Commerce students, Remote job seekers, People looking for practical guidance, not motivation.</p><p>I positioned Keshav as the face of that gap. We used DM automation, clear CTAs, and consistent framing to turn attention into growth.</p>`,
            metrics: [
                'Growing community of MBA aspirants',
                'Engaging educational content',
                'Brand building strategy'
            ],
            videos: [
                'https://www.instagram.com/keshavgrower/embed'
            ]
        },
        'gfg': {
            name: 'GeeksforGeeks',
            image: 'assets/geeks.png',
            growth: '400K → 1.1 Million',
            role: 'Content Strategist',
            description: `<p><strong>Starting point:</strong> ~400K subscribers, ~2K views</p><p>This was my first big brand project - and the most challenging. Despite having a huge subscriber base, GeeksforGeeks couldn’t get views. The problem wasn’t content quality; it was mindset. They were still making content like it was 2017.</p><p>I did competitive analysis, identified working formats, and helped build: Strong short-form hooks, Repeatable IPs, Better pacing for modern platforms.</p><p>Once we doubled down on what worked, growth followed - both in shorts and long-form.</p>`,
            metrics: [
                'Achieved 1.1M+ subscribers',
                'Implemented trend-based content strategy',
                'Created viral shorts and long-form content'
            ],
            videos: [
                'https://www.youtube.com/embed/cC8MjoYGedk',
                'https://www.youtube.com/embed/9yBY0BOZhUE',
                'https://www.youtube.com/embed/tiFIf_nUCZc',
                'https://www.youtube.com/embed/wn0btNJ65ws',
                'https://www.youtube.com/embed/EFNScX1e14o'
            ]
        },
        'sahil': {
            name: 'Sahil Gogna',
            image: 'assets/sahil.png',
            growth: '0 → 150K',
            role: 'Writer / Director',
            description: `<p><strong>Starting point:</strong> Very small audience<br><strong>Breakthrough:</strong> First video crossed 1M+ views</p><p>Sahil was one of those rare cases where the raw material was already there - it just hadn’t been framed properly yet.</p><p>He had a real story. He had moved from India to Canada, struggled, figured things out, and had genuine insight into data, careers, and learning. The mistake most people make in situations like this is jumping straight into “educational content.” I didn’t do that.</p><p>Instead, I leaned into story first, expertise second. For the first few pieces, I focused almost entirely on: His move from India to Canada, The struggle and uncertainty, The contrast between expectations and reality, What he learned the hard way.</p><p>The first video we published crossed 1 million views. That wasn’t because of clever editing - it was because people connected with the narrative. Once the audience cared about him, the educational content started landing much more naturally. From there, the page grew steadily, eventually reaching ~150K followers. Sahil wasn’t just another data guy anymore - he was a person with a journey, and that made all the difference.</p>`,
            metrics: [
                'Grew from 480 to 150K followers',
                'Created viral Instagram reels',
                'Produced educational YouTube content'
            ],
            videos: [
                'https://www.instagram.com/p/C4LNOdOOVg4/embed',
                'https://www.instagram.com/p/C3z_rz2rOLr/embed',
                'https://www.instagram.com/p/DCHKFHBxKXt/embed',
                'https://www.youtube.com/embed/V1g3Ms4bRgc'
            ]
        },
        'binge': {
            name: 'Binge Wealth',
            image: 'assets/binge.png',
            growth: '20K → 150K',
            role: 'Strategist',
            description: `<p><strong>My first finance-focused page</strong><br><strong>Growth:</strong> ~20K → ~150K (when I left)</p><p>Finance content is tricky because it can very easily become boring, intimidating, or spammy. When I joined Binge Wealth, my role was to make finance watchable without making it irresponsible.</p><p>I spent a lot of time tracking: What financial news people were already reacting to, Which topics created anxiety or curiosity, What formats made people actually stay till the end.</p><p>My job was essentially translation. Every trend, update, or concept had to be broken down into something: Simple, Relatable, Slightly entertaining, But still accurate.</p><p>We leaned heavily into trending topics, but always framed them around everyday impact rather than jargon. Over time, this approach helped the page grow rapidly. By the time I left, Binge Wealth had crossed ~150,000 followers and continued growing after.</p>`,
            metrics: [
                'Grew from 20K to 150K followers',
                'Financial storytelling meets lifestyle',
                'Created engaging Instagram content'
            ],
            videos: [
                'https://www.instagram.com/p/DFIYngSzJhb/embed',
                'https://www.instagram.com/p/DDZiMrJTW-J/embed'
            ]
        },
        'zerodha': {
            name: 'Markets by Zerodha',
            image: 'assets/zerodha.png',
            growth: '30K → 100K',
            role: 'Content Strategist',
            description: `<p><strong>My first account for a large company</strong><br><strong>Format:</strong> Daily long-form scripts<br><strong>Focus:</strong> Clarity over hype</p><p>Markets by Zerodha was very different from everything I’d done before. This wasn’t a creator page or a startup experimenting with formats - this was a large, trusted financial brand.</p><p>The requirement was intense. Every day, I had to: Track the biggest financial news, Identify the most important 2–3 stories, Research them properly, Write long-form scripts explaining what happened and why it mattered.</p><p>The hardest part wasn’t writing - it was responsibility. The content had to be: Accurate, Neutral, Easy enough for beginners, But not oversimplified.</p><p>This role forced me to go deep into finance, markets, and macro trends. I learned how to explain complex ideas clearly, without drama or shortcuts. It was demanding, repetitive, and honestly exhausting at times - but it sharpened my ability to research and communicate under pressure.</p>`,
            metrics: [
                'Grew from 30K to 100K subscribers',
                'Simplified trading for beginners',
                'Created engaging financial content'
            ],
            videos: [
                'https://www.youtube.com/embed/gLpyaHLuQVo',
                'https://www.youtube.com/embed/Kf0SV7aZXfI'
            ]
        }
    };

    // Function to generate project modal content
    function generateProjectContent(projectId) {
        const data = projectData[projectId];
        if (!data) return '';

        let html = `
            <div class="modal-header">
                ${data.image ? `<img src="${data.image}" alt="${data.name}" style="width: 100px; height: 100px; border-radius: 50%; margin-bottom: 1rem; object-fit: cover; border: 3px solid #e50914; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">` : ''}
                <h2 class="modal-title">${data.name}</h2>
                <p class="modal-subtitle">${data.role}</p>
                <p style="color: #4ade80; font-size: 1.5rem; font-weight: 600; margin-top: 0.5rem;">${data.growth}</p>
            </div>
            <div class="modal-section">
                <h3>Overview</h3>
                <p>${data.description}</p>
            </div>
            <div class="modal-section">
                <h3>Impact & Metrics</h3>
                <ul>
                    ${data.metrics.map(metric => `<li>${metric}</li>`).join('')}
                </ul>
            </div>
        `;

        if (data.tweet) {
            html += `
                <div class="modal-section">
                    <h3>Launch Post</h3>
                    <div style="display: flex; justify-content: center; width: 100%;">
                        ${data.tweet}
                    </div>
                </div>
            `;
        }

        if (data.videos && data.videos.length > 0) {
            html += `
                <div class="modal-section">
                    <h3>Work Samples</h3>
                    <div class="video-grid">
                        ${data.videos.map(video => generateVideoHTML(video)).join('')}
                    </div>
                </div>
            `;
        }

        return html;
    }

    // Handle project card clicks
    projectCards.forEach(card => {
        card.addEventListener('click', function () {
            const projectId = this.getAttribute('data-project');
            const content = generateProjectContent(projectId);

            projectModalBody.innerHTML = content;
            projectModal.classList.add('active');
            document.body.style.overflow = 'hidden';

            // Reload Twitter widgets if present
            if (window.twttr) {
                window.twttr.widgets.load();
            }
        });
    });

    // Close project modal
    projectModalClose.addEventListener('click', function () {
        projectModal.classList.remove('active');
        document.body.style.overflow = 'auto';
    });

    projectModal.addEventListener('click', function (e) {
        if (e.target === projectModal) {
            projectModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });

    // ============================================
    // NAVBAR SCROLL EFFECT
    // ============================================
    const navbar = document.getElementById('navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        lastScroll = currentScroll;

        // Scroll Spy for Mobile Bottom Nav
        const sections = ['home', 'journey', 'work', 'contact'];
        let currentSection = 'home'; // Default

        sections.forEach(id => {
            const section = document.getElementById(id);
            if (section) {
                // Trigger earlier (when section is 1/3 up the screen or at least close)
                const sectionTop = section.offsetTop - 300;
                if (currentScroll >= sectionTop) {
                    currentSection = id;
                }
            }
        });

        document.querySelectorAll('.mobile-bottom-nav .nav-item').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + currentSection) {
                link.classList.add('active');
            }
        });
    });
});

// ============================================
// PROFILE SWITCHER LOGIC (Appended)
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const currentProfileIcon = document.getElementById('current-profile-icon');
    const profileOptions = document.querySelectorAll('.profile-option');
    const profileCards = document.querySelectorAll('.profile-card');

    // 1. Handle Dropdown Selection
    profileOptions.forEach(option => {
        option.addEventListener('click', () => {
            const newIcon = option.querySelector('.mini-avatar').cloneNode(true);
            if (currentProfileIcon) {
                currentProfileIcon.innerHTML = '';
                currentProfileIcon.appendChild(newIcon);
            }
        });
    });

    // 2. Sync Initial Selection from Landing Page
    if (profileCards) {
        profileCards.forEach(card => {
            card.addEventListener('click', function () {
                const profile = this.getAttribute('data-profile');
                const option = document.querySelector(`.profile-option[data-profile="${profile}"]`);
                if (option && currentProfileIcon) {
                    const newIcon = option.querySelector('.mini-avatar').cloneNode(true);
                    currentProfileIcon.innerHTML = '';
                    currentProfileIcon.appendChild(newIcon);
                }
            });
        });
    }
});
