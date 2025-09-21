// Variables globales
let currentMode = '2D';
let canvas, ctx;
let scene, camera, renderer, controls;
let showGrid = true;

// Variables para interactividad 2D
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let offsetX = 0;
let offsetY = 0;
let scale = 40;
let minScale = 10;
let maxScale = 200;

// Inicialización
function initializeCanvas() {
    canvas = document.getElementById('vectorCanvas');
    if (!canvas) return;
    
    ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Event listeners para interactividad
    setupCanvasInteraction();
    drawVectors();
}

// Configurar interacción del canvas 2D
function setupCanvasInteraction() {
    // Mouse events
    canvas.addEventListener('mousedown', startDrag);
    canvas.addEventListener('mousemove', drag);
    canvas.addEventListener('mouseup', endDrag);
    canvas.addEventListener('wheel', zoom);
    
    // Touch events para móvil
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', endDrag);
}

function startDrag(e) {
    isDragging = true;
    const rect = canvas.getBoundingClientRect();
    lastMouseX = e.clientX - rect.left;
    lastMouseY = e.clientY - rect.top;
    canvas.style.cursor = 'grabbing';
}

function drag(e) {
    if (!isDragging) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    offsetX += mouseX - lastMouseX;
    offsetY += mouseY - lastMouseY;
    
    lastMouseX = mouseX;
    lastMouseY = mouseY;
    
    drawVectors();
}

function endDrag() {
    isDragging = false;
    canvas.style.cursor = 'grab';
}

function zoom(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(minScale, Math.min(maxScale, scale * zoomFactor));
    
    // Zoom hacia el cursor
    const centerX = canvas.width / 2 + offsetX;
    const centerY = canvas.height / 2 + offsetY;
    
    offsetX += (mouseX - centerX) * (1 - newScale / scale);
    offsetY += (mouseY - centerY) * (1 - newScale / scale);
    
    scale = newScale;
    drawVectors();
}

// Touch events
function handleTouchStart(e) {
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        lastMouseX = touch.clientX - rect.left;
        lastMouseY = touch.clientY - rect.top;
        isDragging = true;
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;
        
        offsetX += touchX - lastMouseX;
        offsetY += touchY - lastMouseY;
        
        lastMouseX = touchX;
        lastMouseY = touchY;
        
        drawVectors();
    }
}

// Función para cambiar entre modo 2D y 3D
function setMode(mode) {
    currentMode = mode;
    
    // Actualizar botones de modo
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Mostrar/ocultar componentes Z
    const zElements = ['az', 'bz', 'az-label', 'bz-label'];
    zElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = mode === '3D' ? 'block' : 'none';
        }
    });
    
    // Mostrar/ocultar botón producto cruz
    const cruzBtn = document.getElementById('cruz-btn');
    if (cruzBtn) {
        cruzBtn.style.display = mode === '3D' ? 'block' : 'none';
    }
    
    // Cambiar entre canvas 2D y 3D
    const canvas2D = document.getElementById('vectorCanvas');
    const container3D = document.getElementById('threejs-container');
    
    if (mode === '3D') {
        canvas2D.style.display = 'none';
        container3D.style.display = 'block';
        init3D();
    } else {
        canvas2D.style.display = 'block';
        container3D.style.display = 'none';
        drawVectors();
    }
}

// Inicializar visualización 3D con Three.js
function init3D() {
    const container = document.getElementById('threejs-container');
    if (!container) return;
    
    // Limpiar container anterior
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    
    // Crear escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    
    // Crear cámara
    camera = new THREE.PerspectiveCamera(75, container.offsetWidth / container.offsetHeight, 0.1, 1000);
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
    
    // Crear renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    
    // Agregar luces
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Crear grid 3D
    if (showGrid) {
        const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x444444);
        scene.add(gridHelper);
        
        // Ejes XYZ
        const axesHelper = new THREE.AxesHelper(10);
        scene.add(axesHelper);
    }
    
    // Controles de cámara (simulados)
    setupCamera3DControls();
    
    // Dibujar vectores 3D
    draw3DVectors();
    
    // Iniciar loop de render
    animate3D();
}

function setupCamera3DControls() {
    const container = document.getElementById('threejs-container');
    let isMouseDown = false;
    let mouseX = 0, mouseY = 0;
    
    container.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    container.addEventListener('mousemove', (e) => {
        if (!isMouseDown) return;
        
        const deltaX = e.clientX - mouseX;
        const deltaY = e.clientY - mouseY;
        
        // Rotar cámara alrededor del origen
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(camera.position);
        spherical.theta -= deltaX * 0.01;
        spherical.phi += deltaY * 0.01;
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
        
        camera.position.setFromSpherical(spherical);
        camera.lookAt(0, 0, 0);
        
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    container.addEventListener('mouseup', () => {
        isMouseDown = false;
    });
    
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const distance = camera.position.length();
        const newDistance = distance * (e.deltaY > 0 ? 1.1 : 0.9);
        camera.position.normalize().multiplyScalar(Math.max(5, Math.min(50, newDistance)));
    });
}

function animate3D() {
    requestAnimationFrame(animate3D);
    renderer.render(scene, camera);
}

function draw3DVectors() {
    // Limpiar vectores anteriores
    const vectorsToRemove = [];
    scene.traverse((child) => {
        if (child.userData.isVector) {
            vectorsToRemove.push(child);
        }
    });
    vectorsToRemove.forEach(vector => scene.remove(vector));
    
    const vectors = getVectors();
    const { a, b } = vectors;
    
    // Crear vector A
    if (a.x !== 0 || a.y !== 0 || a.z !== 0) {
        const vectorA = createVector3D(a, 0xff6b6b, 'A');
        scene.add(vectorA);
    }
    
    // Crear vector B
    if (b.x !== 0 || b.y !== 0 || b.z !== 0) {
        const vectorB = createVector3D(b, 0x4ecdc4, 'B');
        scene.add(vectorB);
    }
}

function createVector3D(vector, color, label) {
    const group = new THREE.Group();
    group.userData.isVector = true;
    
    // Crear línea del vector
    const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(vector.x, vector.y, vector.z)
    ]);
    
    const material = new THREE.LineBasicMaterial({ 
        color: color, 
        linewidth: 5,
        transparent: true,
        opacity: 0.8
    });
    
    const line = new THREE.Line(geometry, material);
    group.add(line);
    
    // Crear punta de flecha (cono)
    const length = Math.sqrt(vector.x*vector.x + vector.y*vector.y + vector.z*vector.z);
    if (length > 0) {
        const arrowGeometry = new THREE.ConeGeometry(0.2, 0.6, 8);
        const arrowMaterial = new THREE.MeshLambertMaterial({ color: color });
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        
        // Posicionar y orientar la punta
        arrow.position.set(vector.x, vector.y, vector.z);
        const direction = new THREE.Vector3(vector.x, vector.y, vector.z).normalize();
        arrow.lookAt(direction.clone().add(arrow.position));
        arrow.rotateX(Math.PI / 2);
        
        group.add(arrow);
    }
    
    return group;
}

// Función para obtener los valores de los vectores desde los inputs
function getVectors() {
    const ax = parseFloat(document.getElementById('ax')?.value) || 0;
    const ay = parseFloat(document.getElementById('ay')?.value) || 0;
    const az = parseFloat(document.getElementById('az')?.value) || 0;
    const bx = parseFloat(document.getElementById('bx')?.value) || 0;
    const by = parseFloat(document.getElementById('by')?.value) || 0;
    const bz = parseFloat(document.getElementById('bz')?.value) || 0;
    
    return {
        a: {x: ax, y: ay, z: az},
        b: {x: bx, y: by, z: bz}
    };
}

// Función principal para realizar cálculos
function calculate(operation) {
    const vectors = getVectors();
    const {a, b} = vectors;
    let result = '';
    let resultVector = null;
    
    switch(operation) {
        case 'suma': {
            resultVector = {
                x: a.x + b.x,
                y: a.y + b.y,
                z: a.z + b.z
            };
            result = `<div class="result-item"><strong>A + B = </strong>(${resultVector.x}, ${resultVector.y}${currentMode === '3D' ? ', ' + resultVector.z : ''})</div>`;
            result += `<div class="result-item"><em>Suma vectorial: se suman componente a componente</em></div>`;
            break;
        }
            
        case 'resta': {
            resultVector = {
                x: a.x - b.x,
                y: a.y - b.y,
                z: a.z - b.z
            };
            result = `<div class="result-item"><strong>A - B = </strong>(${resultVector.x}, ${resultVector.y}${currentMode === '3D' ? ', ' + resultVector.z : ''})</div>`;
            result += `<div class="result-item"><em>Resta vectorial: se restan componente a componente</em></div>`;
            break;
        }
            
        case 'producto_punto': {
            const dotProduct = a.x * b.x + a.y * b.y + a.z * b.z;
            const magA = Math.sqrt(a.x*a.x + a.y*a.y + a.z*a.z);
            const magB = Math.sqrt(b.x*b.x + b.y*b.y + b.z*b.z);
            const angle = Math.acos(dotProduct / (magA * magB)) * (180 / Math.PI);
            
            result = `<div class="result-item"><strong>A · B = </strong>${dotProduct.toFixed(2)}</div>`;
            result += `<div class="result-item"><strong>Ángulo entre vectores: </strong>${isNaN(angle) ? 'N/A' : angle.toFixed(2)}°</div>`;
            result += `<div class="result-item"><em>Producto escalar (número real)</em></div>`;
            break;
        }
            
        case 'producto_cruz': {
            resultVector = {
                x: a.y * b.z - a.z * b.y,
                y: a.z * b.x - a.x * b.z,
                z: a.x * b.y - a.y * b.x
            };
            const crossMagnitude = Math.sqrt(resultVector.x*resultVector.x + resultVector.y*resultVector.y + resultVector.z*resultVector.z);
            
            result = `<div class="result-item"><strong>A × B = </strong>(${resultVector.x.toFixed(2)}, ${resultVector.y.toFixed(2)}, ${resultVector.z.toFixed(2)})</div>`;
            result += `<div class="result-item"><strong>Magnitud: </strong>${crossMagnitude.toFixed(2)}</div>`;
            result += `<div class="result-item"><em>Vector perpendicular a A y B</em></div>`;
            break;
        }
            
        case 'magnitud_a': {
            const magA = Math.sqrt(a.x*a.x + a.y*a.y + a.z*a.z);
            result = `<div class="result-item"><strong>|A| = </strong>${magA.toFixed(2)}</div>`;
            result += `<div class="result-item"><strong>Fórmula: </strong>√(${a.x}² + ${a.y}²${currentMode === '3D' ? ' + ' + a.z + '²' : ''})</div>`;
            result += `<div class="result-item"><em>Longitud del vector A</em></div>`;
            break;
        }
            
        case 'magnitud_b': {
            const magB = Math.sqrt(b.x*b.x + b.y*b.y + b.z*b.z);
            result = `<div class="result-item"><strong>|B| = </strong>${magB.toFixed(2)}</div>`;
            result += `<div class="result-item"><strong>Fórmula: </strong>√(${b.x}² + ${b.y}²${currentMode === '3D' ? ' + ' + b.z + '²' : ''})</div>`;
            result += `<div class="result-item"><em>Longitud del vector B</em></div>`;
            break;
        }
        case 'producto_triple': {
            function calculate(type) {
  if (type === 'producto_triple') {
    // Ejemplo: vectores a, b, c
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    const c = [7, 8, 9];

    // Calcular b × c (producto cruz)
    const cruz = [
      b[1] * c[2] - b[2] * c[1],
      b[2] * c[0] - b[0] * c[2],
      b[0] * c[1] - b[1] * c[0]
    ];

    // Producto escalar a · (b × c)
    const resultado = a[0] * cruz[0] + a[1] * cruz[1] + a[2] * cruz[2];

    // Mostrar en el <p id="resultado">
    document.getElementById("resultado").textContent =
      `a · (b × c) = ${resultado}`;
  }
}
    }
    
    // Mostrar resultado
    const resultsElement = document.getElementById('results');
    if (resultsElement) {
        resultsElement.innerHTML = `
            <h3>📋 Resultados</h3>
            ${result}
        `;
    }
    
    // Redibujar vectores con resultado
    if (currentMode === '3D') {
        draw3DVectors();
    } else {
        drawVectors(resultVector, operation);
    }
}

// Función para dibujar los vectores en el canvas 2D mejorado
function drawVectors(resultVector = null, operation = null) {
    if (!ctx || !canvas) return;
    
    const vectors = getVectors();
    const { a, b } = vectors;
    
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Configurar sistema de coordenadas
    const centerX = canvas.width / 2 + offsetX;
    const centerY = canvas.height / 2 + offsetY;
    
    // Dibujar grid profesional
    if (showGrid) {
        drawGrid(centerX, centerY);
    }
    
    // Dibujar ejes principales
    drawAxes(centerX, centerY);
    
    // Función interna para dibujar un vector
    function drawVector(vector, color, label, offsetLabel = 0) {
        if (vector.x === 0 && vector.y === 0) return;
        
        const endX = centerX + vector.x * scale;
        const endY = centerY - vector.y * scale;
        
        // Dibujar línea del vector con gradiente
        const gradient = ctx.createLinearGradient(centerX, centerY, endX, endY);
        gradient.addColorStop(0, color + '80');
        gradient.addColorStop(1, color);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Dibujar punta de flecha mejorada
        const angle = Math.atan2(endY - centerY, endX - centerX);
        const headLength = Math.min(20, Math.sqrt((endX-centerX)**2 + (endY-centerY)**2) * 0.3);
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - headLength * Math.cos(angle - Math.PI / 6),
            endY - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            endX - headLength * Math.cos(angle + Math.PI / 6),
            endY - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
        
        // Etiqueta del vector con fondo
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        const labelWidth = ctx.measureText(label).width;
        ctx.fillRect(endX + 8, endY - 15 + offsetLabel, labelWidth + 8, 20);
        
        ctx.fillStyle = color;
        ctx.fillText(label, endX + 12, endY - 2 + offsetLabel);
        
        // Mostrar coordenadas con fondo
        ctx.font = '12px Arial';
        const coordText = `(${vector.x.toFixed(1)}, ${vector.y.toFixed(1)})`;
        const coordWidth = ctx.measureText(coordText).width;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(endX + 8, endY + 5 + offsetLabel, coordWidth + 8, 16);
        
        ctx.fillStyle = 'white';
        ctx.fillText(coordText, endX + 12, endY + 16 + offsetLabel);
    }
    
    // Dibujar vectores originales
    drawVector(a, '#FF6B6B', 'A');
    drawVector(b, '#4ECDC4', 'B', 25);
    
    // Dibujar vector resultado
    if (resultVector && (operation === 'suma' || operation === 'resta')) {
        const labelMap = { 'suma': 'A+B', 'resta': 'A-B' };
        drawVector(resultVector, '#FFD700', labelMap[operation], 50);
    }
    
    // Dibujar origen con círculo más bonito
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 8);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, '#cccccc');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawGrid(centerX, centerY) {
    const gridSpacing = scale;
    
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    
    // Líneas verticales
    for (let x = centerX % gridSpacing; x < canvas.width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Líneas horizontales
    for (let y = centerY % gridSpacing; y < canvas.height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Números en el grid
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px Arial';
    
    // Números en X
    for (let i = -20; i <= 20; i++) {
        if (i === 0) continue;
        const x = centerX + i * gridSpacing;
        if (x > 0 && x < canvas.width) {
            ctx.fillText(i.toString(), x + 3, centerY - 5);
        }
    }
    
    // Números en Y
    for (let i = -20; i <= 20; i++) {
        if (i === 0) continue;
        const y = centerY - i * gridSpacing;
        if (y > 15 && y < canvas.height) {
            ctx.fillText(i.toString(), centerX + 5, y + 3);
        }
    }
}

function drawAxes(centerX, centerY) {
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    
    // Eje X
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();
    
    // Eje Y
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, canvas.height);
    ctx.stroke();
    
    // Etiquetas de ejes
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('X', canvas.width - 25, centerY - 10);
    ctx.fillText('Y', centerX + 10, 20);
    ctx.fillText('O', centerX + 10, centerY - 10);
}

// Funciones de control
function resetView() {
    offsetX = 0;
    offsetY = 0;
    scale = 40;
    if (currentMode === '3D' && camera) {
        camera.position.set(10, 10, 10);
        camera.lookAt(0, 0, 0);
    } else {
        drawVectors();
    }
}

function toggleGrid() {
    showGrid = !showGrid;
    if (currentMode === '3D') {
        init3D();
    } else {
        drawVectors();
    }
}

function autoFit() {
    const vectors = getVectors();
    const { a, b } = vectors;
    
    if (currentMode === '2D') {
        // Encontrar el rango de los vectores
        const maxX = Math.max(Math.abs(a.x), Math.abs(b.x), Math.abs(a.x + b.x), Math.abs(a.x - b.x));
        const maxY = Math.max(Math.abs(a.y), Math.abs(b.y), Math.abs(a.y + b.y), Math.abs(a.y - b.y));
        const maxValue = Math.max(maxX, maxY);
        
        if (maxValue > 0) {
            // Ajustar escala para que los vectores se vean bien
            scale = Math.min(canvas.width, canvas.height) / (maxValue * 3);
            scale = Math.max(minScale, Math.min(maxScale, scale));
            
            // Centrar vista
            offsetX = 0;
            offsetY = 0;
            
            drawVectors();
        }
    } else if (currentMode === '3D' && camera) {
        // Auto fit para 3D
        const maxValue = Math.max(
            Math.sqrt(a.x*a.x + a.y*a.y + a.z*a.z),
            Math.sqrt(b.x*b.x + b.y*b.y + b.z*b.z)
        );
        
        if (maxValue > 0) {
            const distance = maxValue * 3;
            camera.position.normalize().multiplyScalar(Math.max(5, Math.min(50, distance)));
        }
    }
}

// Inicialización cuando se carga la página
window.onload = function() {
    initializeCanvas();
    
    // Agregar event listeners a los inputs
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('input', () => {
            if (currentMode === '3D') {
                draw3DVectors();
            } else {
                drawVectors();
            }
        });
    });
};

// Redibujar al cambiar el tamaño de ventana
window.onresize = function() {
    if (canvas) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        drawVectors();
    }
    
    if (renderer && currentMode === '3D') {
        const container = document.getElementById('threejs-container');
        if (container) {
            camera.aspect = container.offsetWidth / container.offsetHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.offsetWidth, container.offsetHeight);
        }
    }
};
