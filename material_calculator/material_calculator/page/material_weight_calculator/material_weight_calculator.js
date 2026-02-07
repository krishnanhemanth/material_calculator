frappe.pages['material-weight-calculator'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Material Weight Calculator',
        single_column: true
    });

    const style = `
        <style>
            .calc-container { max-width: 900px; margin: 20px auto; }
            .calc-section { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .calc-row { display: flex; gap: 15px; margin: 15px 0; flex-wrap: wrap; }
            .calc-field { flex: 1; min-width: 200px; }
            .calc-field label { display: block; margin-bottom: 5px; font-weight: 600; color: #555; }
            .calc-field input, .calc-field select { width: 100%; padding: 8px; border: 1px solid #d1d8dd; border-radius: 4px; }
            .result-box { background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .result-value { font-size: 32px; font-weight: bold; color: #2e7d32; }
            .result-label { font-size: 14px; color: #666; margin-top: 5px; }
            .shape-diagram { text-align: center; margin: 15px 0; padding: 15px; background: #f5f5f5; border-radius: 8px; }
            .btn-calculate { background: #2490ef; color: white; padding: 12px 30px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
            .btn-calculate:hover { background: #1976d2; }
            .dimension-group { border-left: 3px solid #2490ef; padding-left: 15px; margin: 15px 0; }
        </style>
    `;

    $(wrapper).prepend(style);

    const calculatorHTML = `
        <div class="calc-container">
            <div class="calc-section">
                <h3>Material Selection</h3>
                <div class="calc-row">
                    <div class="calc-field">
                        <label>Material *</label>
                        <select id="material-select" required>
                            <option value="">Select Material...</option>
                        </select>
                    </div>
                    <div class="calc-field">
                        <label>Density (g/cm³)</label>
                        <input type="number" id="material-density" step="0.0001" readonly style="background: #f5f5f5;">
                    </div>
                </div>
            </div>

            <div class="calc-section">
                <h3>Shape & Dimensions</h3>
                <div class="calc-row">
                    <div class="calc-field">
                        <label>Shape Type *</label>
                        <select id="shape-select" required>
                            <option value="">Select Shape...</option>
                            <option value="rectangular">Rectangle/Square Bar</option>
                            <option value="round">Round Bar/Rod</option>
                            <option value="tube">Tube/Pipe</option>
                            <option value="sheet">Sheet/Plate</option>
                        </select>
                    </div>
                </div>

                <div id="dimension-container" class="dimension-group" style="display: none;"></div>
                <div class="shape-diagram" id="shape-diagram" style="display: none;"></div>
            </div>

            <div class="calc-section" style="text-align: center;">
                <button class="btn-calculate" id="btn-calculate">Calculate Weight</button>
            </div>

            <div id="result-container" style="display: none;">
                <div class="result-box">
                    <div class="result-value" id="result-weight">0.00</div>
                    <div class="result-label">grams (g)</div>
                    <div style="margin-top: 15px; color: #666;">
                        <span id="result-kg">0.000 kg</span> | 
                        <span id="result-volume">Volume: 0.00 cm³</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    $(wrapper).find(".layout-main-section").html(calculatorHTML);

    loadMaterials();

    $('#shape-select').on('change', function() {
        const shape = $(this).val();
        showDimensions(shape);
    });

    $('#material-select').on('change', function() {
        const density = $(this).find(':selected').data('density');
        $('#material-density').val(density || '');
    });

    $('#btn-calculate').on('click', calculateWeight);
};

function loadMaterials() {
    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Material Density',
            fields: ['name', 'material_name', 'density', 'category'],
            order_by: 'category, material_name',
            limit_page_length: 0
        },
        callback: function(r) {
            if (r.message) {
                const select = $('#material-select');
                let currentCategory = '';

                r.message.forEach(function(material) {
                    if (material.category && material.category !== currentCategory) {
                        currentCategory = material.category;
                        select.append(`<option disabled>── ${currentCategory} ──</option>`);
                    }
                    select.append(`<option value="${material.name}" data-density="${material.density}">${material.material_name}</option>`);
                });
            }
        }
    });
}

function showDimensions(shape) {
    const container = $('#dimension-container');
    const diagram = $('#shape-diagram');
    let html = '';
    let diagramHTML = '';

    switch(shape) {
        case 'rectangular':
            html = `
                <h4>Rectangle/Square Bar Dimensions</h4>
                <div class="calc-row">
                    <div class="calc-field"><label>Width (mm) *</label><input type="number" id="dim-width" step="0.01" min="0" required></div>
                    <div class="calc-field"><label>Height (mm) *</label><input type="number" id="dim-height" step="0.01" min="0" required></div>
                    <div class="calc-field"><label>Length (mm) *</label><input type="number" id="dim-length" step="0.01" min="0" required></div>
                </div>
            `;
            diagramHTML = `<div style="font-size: 12px; color: #666;">Volume = Width × Height × Length</div>`;
            break;

        case 'round':
            html = `
                <h4>Round Bar/Rod Dimensions</h4>
                <div class="calc-row">
                    <div class="calc-field"><label>Diameter (mm) *</label><input type="number" id="dim-diameter" step="0.01" min="0" required></div>
                    <div class="calc-field"><label>Length (mm) *</label><input type="number" id="dim-length" step="0.01" min="0" required></div>
                </div>
            `;
            diagramHTML = `<div style="font-size: 12px; color: #666;">Volume = π × (Diameter/2)² × Length</div>`;
            break;

        case 'tube':
            html = `
                <h4>Tube/Pipe Dimensions</h4>
                <div class="calc-row">
                    <div class="calc-field"><label>Outer Diameter (mm) *</label><input type="number" id="dim-outer-diameter" step="0.01" min="0" required></div>
                    <div class="calc-field"><label>Wall Thickness (mm) *</label><input type="number" id="dim-thickness" step="0.01" min="0" required></div>
                    <div class="calc-field"><label>Length (mm) *</label><input type="number" id="dim-length" step="0.01" min="0" required></div>
                </div>
            `;
            diagramHTML = `<div style="font-size: 12px; color: #666;">Volume = π × [(OD/2)² - (ID/2)²] × Length<br>where ID = OD - 2×Thickness</div>`;
            break;

        case 'sheet':
            html = `
                <h4>Sheet/Plate Dimensions</h4>
                <div class="calc-row">
                    <div class="calc-field"><label>Width (mm) *</label><input type="number" id="dim-width" step="0.01" min="0" required></div>
                    <div class="calc-field"><label>Length (mm) *</label><input type="number" id="dim-length" step="0.01" min="0" required></div>
                    <div class="calc-field"><label>Thickness (mm) *</label><input type="number" id="dim-thickness" step="0.01" min="0" required></div>
                </div>
            `;
            diagramHTML = `<div style="font-size: 12px; color: #666;">Volume = Width × Length × Thickness</div>`;
            break;
    }

    if (html) {
        container.html(html).show();
        diagram.html(diagramHTML).show();
    } else {
        container.hide();
        diagram.hide();
    }
}

function calculateWeight() {
    const material = $('#material-select').val();
    const density = parseFloat($('#material-density').val());
    const shape = $('#shape-select').val();

    if (!material || !density || !shape) {
        frappe.msgprint('Please select material and shape, and enter all dimensions.');
        return;
    }

    let volume = 0;

    try {
        switch(shape) {
            case 'rectangular':
                const width = parseFloat($('#dim-width').val());
                const height = parseFloat($('#dim-height').val());
                const length = parseFloat($('#dim-length').val());
                if (!width || !height || !length) throw new Error('Missing dimensions');
                volume = width * height * length;
                break;

            case 'round':
                const diameter = parseFloat($('#dim-diameter').val());
                const lengthRound = parseFloat($('#dim-length').val());
                if (!diameter || !lengthRound) throw new Error('Missing dimensions');
                const radius = diameter / 2;
                volume = Math.PI * radius * radius * lengthRound;
                break;

            case 'tube':
                const outerDiameter = parseFloat($('#dim-outer-diameter').val());
                const thickness = parseFloat($('#dim-thickness').val());
                const lengthTube = parseFloat($('#dim-length').val());
                if (!outerDiameter || !thickness || !lengthTube) throw new Error('Missing dimensions');
                const outerRadius = outerDiameter / 2;
                const innerRadius = outerRadius - thickness;
                volume = Math.PI * (outerRadius * outerRadius - innerRadius * innerRadius) * lengthTube;
                break;

            case 'sheet':
                const widthSheet = parseFloat($('#dim-width').val());
                const lengthSheet = parseFloat($('#dim-length').val());
                const thicknessSheet = parseFloat($('#dim-thickness').val());
                if (!widthSheet || !lengthSheet || !thicknessSheet) throw new Error('Missing dimensions');
                volume = widthSheet * lengthSheet * thicknessSheet;
                break;
        }

        const volumeCm3 = volume / 1000;
        const weightGrams = volumeCm3 * density;
        const weightKg = weightGrams / 1000;

        $('#result-weight').text(weightGrams.toFixed(2));
        $('#result-kg').text(weightKg.toFixed(3) + ' kg');
        $('#result-volume').text('Volume: ' + volumeCm3.toFixed(2) + ' cm³');
        $('#result-container').slideDown();

    } catch (error) {
        frappe.msgprint('Please enter all required dimensions.');
    }
}
