# Perception Test Images

This directory contains pre-generated images for the perception test component. These images are loaded directly from here rather than being generated dynamically via Gemini, reducing API calls and improving performance.

## Image Naming Convention

Images are named according to their question IDs in the format: `{questionId}.jpg`

### Image List

#### Image Perception Tests (Grade 1-2)
- `ip-1-1.jpg` - Park with swings, trees, and path (simple, colorful, cartoon style)
- `ip-1-2.jpg` - Cozy house with glowing windows and snow
- `ip-1-3.jpg` - Two children sharing umbrella in rain

#### Image Perception Tests (Grade 3-4)
- `ip-3-1.jpg` - Empty classroom with sunlit window
- `ip-3-2.jpg` - Forest path with dappled sunlight
- `ip-3-3.jpg` - Indian marketplace scene (vibrant, colorful)

#### Image Perception Tests (Grade 5-6)
- `ip-5-1.jpg` - Abstract flowing curves (blues/greens)
- `ip-5-2.jpg` - Optical illusion (vase or faces)
- `ip-5-3.jpg` - Open book on desk by window with leaves

#### Image Perception Tests (Grade 7-8)
- `ip-7-1.jpg` - Tree on hill, half daylight/half moonlight
- `ip-7-2.jpg` - Abstract geometric shapes (warm/cool colors)

#### Image Perception Tests (Grade 9-10)
- `ip-9-1.jpg` - Hourglass with city above, forest below
- `ip-9-2.jpg` - Person at crossroads (city path vs village path)
- `ip-9-3.jpg` - Ancient ruins overtaken by nature

#### Emotion Interpretation Tests (Grade 1-2)
- `ei-1-1.jpg` - Child with surprised expression
- `ei-1-2.jpg` - Child with proud/happy expression holding certificate

#### Emotion Interpretation Tests (Grade 3-4)
- `ei-3-1.jpg` - Child looking out window at rain (ambiguous emotion)
- `ei-3-2.jpg` - Two children, one sad, one comforting

#### Emotion Interpretation Tests (Grade 5-6)
- `ei-5-1.jpg` - Student looking at report card (complex emotion)

#### Emotion Interpretation Tests (Grade 7-8)
- `ei-7-1.jpg` - Person at farewell party (smiling but sad inside)

#### Emotion Interpretation Tests (Grade 9-10)
- `ei-9-1.jpg` - Three students in hallway (complex social situation)
- `ei-9-2.jpg` - Graduate with diploma at school gate (mixed emotions)

#### Perspective Tests (Grade 3-4)
- `pt-3-1.jpg` - Single boat on calm lake (peaceful or lonely)

#### Perspective Tests (Grade 5-6)
- `pt-5-1.jpg` - Road stretching to horizon with cloudy sky

#### Perspective Tests (Grade 7-8)
- `pt-7-1.jpg` - City street from above and street level (split view)

#### Perspective Tests (Grade 9-10)
- `pt-9-1.jpg` - Landscape transformation (forest → development → sustainable city)
- `pt-9-2.jpg` - Banyan tree in Indian village (children, elders, teenager)

## Image Specifications

- **Format**: JPEG (.jpg)
- **Dimensions**: 800x600px (minimum) or similar aspect ratio
- **Quality**: High quality, optimized for web
- **Style**: Child-friendly, illustrated/cartoon style (not photorealistic for grades 1-6)
- **Content**: No text or words in images
- **Language**: Images should be culturally appropriate and inclusive

## Notes for Image Generation

When generating these images (via Gemini or other tools), ensure:
1. All images are appropriate for the specified age group
2. Images should be interpretable and not emotionally extreme (unless the prompt specifically requires ambiguity)
3. Include diverse representation where appropriate
4. Images should encourage thoughtful responses rather than having obvious "correct" interpretations

## Implementation Status

The perception test system is now configured to:
- Load images from this directory first (via the `imageUrl` field in question definitions)
- Fall back to Gemini API generation only if no pre-generated image is found
- This approach eliminates unnecessary API calls while maintaining flexibility for new questions

To add a new image:
1. Generate or create the image according to the specifications
2. Place it in this directory with the appropriate question ID
3. The system will automatically use it (imageUrl is already configured in perceptionTestData.ts)
