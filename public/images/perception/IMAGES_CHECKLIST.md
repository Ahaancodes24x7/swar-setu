# Perception Test Image Filenames - Quick Reference

## All 25 Images Needed

Copy this list when generating or organizing images:

### Image Perception Tests (13 images)
```
ip-1-1.jpg  - Colorful park with swings, trees, and path
ip-1-2.jpg  - Cozy house with glowing windows and snow
ip-1-3.jpg  - Two children sharing umbrella in rain
ip-3-1.jpg  - Empty classroom with sunlit window
ip-3-2.jpg  - Winding forest path with dappled sunlight
ip-3-3.jpg  - Busy Indian marketplace (vibrant)
ip-5-1.jpg  - Abstract art (blue/green flowing curves)
ip-5-2.jpg  - Optical illusion (vase or two faces)
ip-5-3.jpg  - Open book on desk by window with leaves
ip-7-1.jpg  - Tree on hill (half day, half night)
ip-7-2.jpg  - Abstract geometric shapes (warm/cool colors)
ip-9-1.jpg  - Hourglass (city above, forest below)
ip-9-2.jpg  - Person at crossroads (city x village path)
```

### Additional Images for Extended Set (12 images)
```
ip-9-3.jpg  - Ancient ruins overtaken by nature
ei-1-1.jpg  - Child with surprised expression
ei-1-2.jpg  - Child with proud expression holding certificate
ei-3-1.jpg  - Child looking out window at rain
ei-3-2.jpg  - Two children (one sad, one comforting)
ei-5-1.jpg  - Student looking at report card
ei-7-1.jpg  - Person at farewell party (hidden sadness)
ei-9-1.jpg  - Three students in hallway (complex situation)
ei-9-2.jpg  - Graduate with diploma at school gate
pt-3-1.jpg  - Single boat on calm lake
pt-5-1.jpg  - Road stretching to horizon
pt-7-1.jpg  - City street (aerial vs street level)
```

### For Perspective Tests (2 images)
```
pt-9-1.jpg  - Landscape transformation (forest→urban→sustainable)
pt-9-2.jpg  - Banyan tree with children, elders, and teenager
```

## Quick Checklist

- [ ] ip-1-1.jpg
- [ ] ip-1-2.jpg
- [ ] ip-1-3.jpg
- [ ] ip-3-1.jpg
- [ ] ip-3-2.jpg
- [ ] ip-3-3.jpg
- [ ] ip-5-1.jpg
- [ ] ip-5-2.jpg
- [ ] ip-5-3.jpg
- [ ] ip-7-1.jpg
- [ ] ip-7-2.jpg
- [ ] ip-9-1.jpg
- [ ] ip-9-2.jpg
- [ ] ip-9-3.jpg
- [ ] ei-1-1.jpg
- [ ] ei-1-2.jpg
- [ ] ei-3-1.jpg
- [ ] ei-3-2.jpg
- [ ] ei-5-1.jpg
- [ ] ei-7-1.jpg
- [ ] ei-9-1.jpg
- [ ] ei-9-2.jpg
- [ ] pt-3-1.jpg
- [ ] pt-5-1.jpg
- [ ] pt-7-1.jpg
- [ ] pt-9-1.jpg
- [ ] pt-9-2.jpg

## Instructions

1. Generate or source all 27 images
2. Save each as JPEG (.jpg)
3. Name them exactly as listed above
4. Place in: `public/images/perception/`
5. Restart the application
6. Run a perception test to verify images load

## File Format Details

- **Extension**: .jpg (JPEG format)
- **Minimum Size**: 800x600 pixels
- **Recommended Size**: 1024x768 or similar aspect ratio
- **File Size**: Optimize to <500KB per image
- **Quality**: High quality but web-optimized

## Verification

After adding images, you can verify they're being used correctly:
1. Open browser DevTools (F12)
2. Go to Network tab
3. Run perception test
4. Look for requests to `/images/perception/*.jpg`
5. Should see 200 status (loaded) instead of 404 (not found)

Note: If imageUrl files don't exist, the system will fall back to Gemini API generation, so availability is not breaking.
