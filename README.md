# Vibe Code Fridays: Identity Assurance Suite

A dual-route interactive web experience built to explore the extremes of browser-based rendering. 

What begins as a highly sterile, dystopian "Corporate Identity Verification" portal quickly devolves into one of two intense audiovisual experiences, depending on the user's choice. 

This project was built to test the limits of combining the `getUserMedia` API (webcam access) with real-time CSS/GPU animations and Canvas/CPU manipulation.

## ⚠️ Important Usage Notes

### 1. Camera Permissions
To fully experience this app, **you must allow camera access when prompted by your browser**. 
* The core mechanic of the app relies on capturing a static snapshot of your face.
* **Privacy Guarantee:** The image is only drawn onto a temporary HTML5 Canvas in your local browser memory. **No image data is ever saved, transmitted, or uploaded to any server.** When you refresh the page or close the tab, the image is permanently deleted.

### 2. Audio Warning
This experience features loud, autoplays audio upon clicking the buttons. **Please lower your volume or remove headphones before proceeding.**

### 3. Visual Warning (Flashing Lights)
The "Rave Route" contains aggressive CSS strobe effects and rapidly flashing colors. **Do not click the Rave button if you are sensitive to flashing lights or suffer from photosensitive epilepsy.**

---

## Technical Architecture (The Two Routes)

This app features two distinct visual engines to demonstrate the difference between CPU-heavy and GPU-heavy rendering loops in modern web browsers.

### Route A: The Acid Trip (CPU / JavaScript)
* Relies heavily on `app.js` and the Canvas API.
* Uses a `requestAnimationFrame` loop to constantly calculate trigonometry (`Math.sin` and `Math.cos`).
* Physically redraws multiple cascading instances of the captured image 60 times a second to create geometric mandalas.
* Uses complex SVG `<feDisplacementMap>` filters to "melt" the image over a shifting CSS background.

### Route B: The Rave Route (GPU / CSS)
* A purely CSS-driven engine located in the `.rave-mode` namespace in `styles.css`.
* JavaScript acts only as a trigger, adding the class and stepping back.
* Uses hardware-accelerated CSS `@keyframes` and `transform` properties to scale (bounce) the image, run intense strobe flashes, and render sweeping neon lasers without taxing the CPU.

## Local Setup
If you wish to run this locally:
1. Clone the repository.
2. Open `index.html` in a modern browser (Chrome/Firefox recommended).
3. Ensure your local environment allows camera permissions (some strict browsers block camera access on `file://` protocols, so a local server like Live Server is recommended).
