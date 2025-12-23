if (!sessionStorage.getItem('username')) {
    window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    const API = {
        products: '/api/products',
        bills: '/api/bills',
        sellHistory: '/api/sell-history',
        settings: '/api/settings'
    };

    // DOM Elements
    const productsTable = document.getElementById('productsTable').querySelector('tbody');
    const billsTable = document.getElementById('billsTable').querySelector('tbody');
    const sellHistoryTable = document.getElementById('sellHistoryTable').querySelector('tbody');
    const addProductBtn = document.getElementById('addProductBtn');
    const createBillBtn = document.getElementById('createBillBtn');
    const addProductModal = document.getElementById('addProductModal');
    const addBillModal = document.getElementById('addBillModal');
    const addProductForm = document.getElementById('addProductForm');
    const editProductForm = document.getElementById('editProductForm');
    const addBillForm = document.getElementById('addBillForm');
    const searchProductBtn = document.getElementById('searchProductBtn');
    const productSearchInput = document.getElementById('productSearch');
    const addItemToBillBtn = document.getElementById('addItemToBillBtn');
    
    const productsNavBtn = document.getElementById('productsNavBtn');
    const billsNavBtn = document.getElementById('billsNavBtn');
    const sellHistoryNavBtn = document.getElementById('sellHistoryNavBtn');
    
    const productsSection = document.querySelector('.products-section');
    const billsSection = document.querySelector('.bills-section');
    const sellHistorySection = document.querySelector('.sell-history-section');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const settingsForm = document.getElementById('settingsForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const navButtons = [productsNavBtn, billsNavBtn, sellHistoryNavBtn];

    let productsCache = [];
    let shopSettingsCache = {};

    // ZXing barcode scanning integration
    let codeReader;
    let barcodeStream;

    // --- Shop Logo Handling ---
    const logoInput = document.getElementById('logoInput');
    let shopLogoDataUrl = localStorage.getItem('shopLogoDataUrl') || '';

    if (logoInput) {
        logoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    shopLogoDataUrl = evt.target.result;
                    localStorage.setItem('shopLogoDataUrl', shopLogoDataUrl);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Modal Functions
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            if (modalId === 'addBillModal') {
                setTimeout(() => {
                    const input = document.getElementById('productSearch');
                    if (input) input.focus();
                }, 100);
            }
        }
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    // Close modals when clicking on close button or outside
    document.querySelectorAll('.modal .close-modal').forEach(button => {
        button.onclick = function() {
            closeModal(button.closest('.modal').id);
        }
    });

    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target.id);
        }
    }


    // Loading State Functions
    function setLoading(element, isLoading) {
        if(!element) return;
        if (isLoading) {
            element.disabled = true;
            const originalContent = element.innerHTML;
            element.dataset.originalContent = originalContent;
            element.innerHTML = `<span class="loading"></span> Loading...`;
        } else {
            element.disabled = false;
            if (element.dataset.originalContent) {
                element.innerHTML = element.dataset.originalContent;
            }
        }
    }

    // Notification Function
    function showNotification(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            toast.style.animation = 'toastOut 0.4s forwards';
            setTimeout(() => toast.remove(), 400);
        }, 2600);
    }

    // Button ripple effect
    function addRippleEffect(e) {
        const button = e.currentTarget;
        const circle = document.createElement('span');
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${e.clientX - button.getBoundingClientRect().left - radius}px`;
        circle.style.top = `${e.clientY - button.getBoundingClientRect().top - radius}px`;
        circle.classList.add('ripple');
        button.appendChild(circle);
        setTimeout(() => circle.remove(), 600);
    }
    document.querySelectorAll('.btn, button, input[type="submit"]').forEach(btn => {
        btn.addEventListener('click', addRippleEffect);
    });

    // Product Functions
    async function loadProducts() {
        try {
            setLoading(addProductBtn, true);
            const response = await fetch(API.products);
            const products = await response.json();
            productsTable.innerHTML = '';
            if (products.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `<td class="empty-state" colspan="5">No products yet. Add your first product to get started.</td>`;
                productsTable.appendChild(row);
            } else {
                products.forEach(product => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${product.name}</td>
                        <td>${product.barcode || '-'}</td>
                        <td>₹${product.price.toFixed(2)}</td>
                        <td>${product.stock}</td>
                        <td>
                            <button class="btn edit-product-btn" data-id="${product.id}"><i class="fas fa-edit"></i> Update Product</button>
                        </td>
                    `;
                    productsTable.appendChild(row);
                });
            }
        } catch (error) {
            console.error('Error loading products:', error);
            showNotification('Error loading products', 'error');
        } finally {
            setLoading(addProductBtn, false);
        }
    }
    
    async function editProduct(id) {
        try {
            const response = await fetch(`${API.products}/${id}`);
            if (!response.ok) {
                throw new Error('Failed to fetch product');
            }
            const product = await response.json();
            // Fill the edit form with product data
            document.getElementById('editProductId').value = product.id;
            document.getElementById('editProductName').value = product.name;
            document.getElementById('editProductPrice').value = product.price;
            document.getElementById('editProductStock').value = product.stock;
            document.getElementById('editProductCode').value = product.barcode || '';
            // Show the edit modal
            openModal('editProductModal');
        } catch (error) {
            console.error('Error fetching product:', error);
            showNotification('Error loading product details', 'error');
        }
    }

    async function updateProduct(event) {
        event.preventDefault();
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const productId = document.getElementById('editProductId').value;
        const product = {
            id: productId,
            name: document.getElementById('editProductName').value,
            price: parseFloat(document.getElementById('editProductPrice').value),
            stock: parseInt(document.getElementById('editProductStock').value),
            barcode: document.getElementById('editProductCode').value
        };
        
        // Check for duplicate barcode (excluding current product)
        if (product.barcode && product.barcode.trim() !== '') {
            const existingProduct = productsCache.find(p => p.barcode === product.barcode && p.id !== productId);
            if (existingProduct) {
                showNotification(`Barcode '${product.barcode}' is already in use by product '${existingProduct.name}'`, 'error');
                return;
            }
        }
        
        try {
            setLoading(submitBtn, true);
            const response = await fetch(`${API.products}/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(product)
            });
            if (response.ok) {
                closeModal('editProductModal');
                loadProducts();
                loadProductOptions();
                showNotification('Product updated successfully', 'success');
            } else {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to update product');
            }
        } catch (error) {
            console.error('Error updating product:', error);
            showNotification(`Error updating product: ${error.message}`, 'error');
        } finally {
            setLoading(submitBtn, false);
        }
    }
    
    async function addProduct() {
        const productData = {
            name: document.getElementById('productName').value,
            price: parseFloat(document.getElementById('productPrice').value),
            stock: parseInt(document.getElementById('productStock').value),
            barcode: document.getElementById('productCode').value
        };
        
        if (!productData.name || isNaN(productData.price) || isNaN(productData.stock)) {
            showNotification('Please fill in all required fields correctly', 'error');
            return;
        }

        // Check for duplicate barcode
        if (productData.barcode && productData.barcode.trim() !== '') {
            const existingProduct = productsCache.find(p => p.barcode === productData.barcode);
            if (existingProduct) {
                showNotification(`Barcode '${productData.barcode}' is already in use by product '${existingProduct.name}'`, 'error');
                return;
            }
        }
        
        try {
            const response = await fetch(API.products, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to add product');
            }
            
            const savedProduct = await response.json();
            showNotification('Product added successfully!', 'success');
            closeModal('addProductModal');
            document.getElementById('addProductForm').reset();
            loadProducts();
            loadProductOptions();
        } catch (error) {
            console.error('Error adding product:', error);
            showNotification(`Error adding product: ${error.message}`, 'error');
        }
    }

    // Bill Functions
    async function loadBills() {
        try {
            setLoading(createBillBtn, true);
            const response = await fetch(API.bills);
            const bills = await response.json();
            billsTable.innerHTML = '';
            if (bills.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `<td class="empty-state" colspan="6">No bills yet. Create a bill to see it listed here.</td>`;
                billsTable.appendChild(row);
            } else {
                bills.forEach(bill => {
                    const row = document.createElement('tr');
                    const items = bill.item.map(i => `${i.productName} (${i.quantity})`).join(', ');
                    const barcodes = bill.item.map(i => i.barcode || '').join(', ');
                    row.innerHTML = `
                        <td>${bill.id}</td>
                        <td>${new Date(bill.createdAt).toLocaleString()}</td>
                        <td>${items}</td>
                        <td>${barcodes}</td>
                        <td>${bill.item.reduce((sum, i) => sum + i.quantity, 0)}</td>
                        <td>
                             <button class="btn btn-print print-bill-btn" data-id="${bill.id}"><i class="fas fa-print"></i> Print</button>
                             <button class="btn btn-delete delete-bill-btn" data-id="${bill.id}"><i class="fas fa-trash"></i> Delete</button>
                        </td>
                    `;
                    billsTable.appendChild(row);
                });
            }
        } catch (error) {
            console.error('Error loading bills:', error);
            showNotification('Error loading bills', 'error');
        } finally {
            setLoading(createBillBtn, false);
        }
    }

    async function printBill(billId) {
        try {
            const response = await fetch(`${API.bills}/${billId}`);
            if (!response.ok) {
                throw new Error('Bill not found');
            }
            const bill = await response.json();
            const settings = shopSettingsCache;

            // Format date and time
            const dateObj = new Date(bill.createdAt);
            const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

            // Collect all barcodes (unique, non-empty)
            const barcodes = [...new Set(bill.item.map(i => i.barcode).filter(b => b && b.trim() !== ''))].join(', ');

            let billContent = `
                <html>
                <head>
                    <title>Bill - ${bill.id}</title>
                    <style>
                        body { font-family: 'Courier New', Courier, monospace; margin: 0; padding: 0; background: #fff; }
                        .receipt-container { width: 420px; margin: 30px auto; padding: 24px 18px; background: #fff; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.05); border-radius: 8px; }
                        .header { text-align: center; margin-bottom: 10px; }
                        .header h1 { font-size: 1.5em; margin: 0 0 6px; }
                        .header p { margin: 2px 0; font-size: 1em; }
                        .meta-table { width: 100%; margin: 18px 0 10px 0; border-collapse: collapse; }
                        .meta-table td { padding: 4px 8px; font-size: 1em; border: none; }
                        .meta-table .field { font-weight: bold; width: 110px; }
                        .section-title { font-size: 1.1em; font-weight: bold; margin: 18px 0 6px 0; letter-spacing: 1px; }
                        .bill-table { width: 100%; border-collapse: collapse; margin: 0 0 10px 0; }
                        .bill-table th, .bill-table td { padding: 7px 4px; text-align: left; border-bottom: 1px solid #eee; font-size: 1em; }
                        .bill-table th { font-weight: bold; text-align: left; letter-spacing: 1px; background: #f7f7f7; }
                        .bill-table td.amount, .bill-table th.amount { text-align: right; }
                        .bill-table td.qty, .bill-table th.qty { text-align: center; }
                        .bill-table td.rate, .bill-table th.rate { text-align: right; }
                        .bill-table tr:last-child td { border-bottom: none; }
                        .total-row td { font-weight: bold; font-size: 1.1em; border-top: 2px solid #222; background: #f7f7f7; }
                        .thankyou { text-align: center; margin-top: 18px; font-size: 1.1em; font-weight: 500; }
                        .emoji { font-size: 1.2em; vertical-align: middle; }
                        .logo-img { max-width: 120px; max-height: 80px; margin-bottom: 8px; display: block; margin-left: auto; margin-right: auto; }
                    </style>
                </head>
                <body>
                    <div class="receipt-container">
                        <div class="header">
                            ${shopLogoDataUrl ? `<img src="${shopLogoDataUrl}" class="logo-img" alt="Shop Logo">` : ''}
                            <div class="emoji">🧾</div>
                            <h1>${settings.shopName || 'SHREY VASTRALAY'}</h1>
                            <p>${settings.address || 'Law Garden Corner, Broadway<br>Business Centre, Netaji Rd<br>Ghazipur, Uttar Pradesh, India - 233001'}</p>
                            <p>Phone No: ${settings.phone || '9569248304'}</p>
                            <p>GSTIN: ${settings.gstin || 'F88AI No.: 751681'}</p>
                        </div>
                        <div class="header" style="margin-bottom:0;">
                            <div class="emoji">🛍️</div>
                            <span style="font-size:1.1em;font-weight:bold;">RETAIL INVOICE</span>
                        </div>
                        <table class="meta-table">
                            <tr><td class="field">BILL NO:</td><td>${bill.id}</td></tr>
                            <tr><td class="field">Barcode:</td><td>${barcodes || '-'}</td></tr>
                            <tr><td class="field">BILL DATE:</td><td>${dateStr}</td></tr>
                            <tr><td class="field">TIME:</td><td>${timeStr}</td></tr>
                        </table>
                        <div class="section-title"><span class="emoji">📋</span> Particulars</div>
                        <table class="bill-table">
                            <thead>
                                <tr>
                                    <th>Particulars</th>
                                    <th class="rate">Rate (₹)</th>
                                    <th class="qty">Qty</th>
                                    <th class="amount">Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            bill.item.forEach(item => {
                billContent += `
                    <tr>
                        <td>${item.productName}</td>
                        <td class="rate">${item.price.toFixed(0)}</td>
                        <td class="qty">${item.quantity}</td>
                        <td class="amount">${(item.price * item.quantity).toFixed(0)}</td>
                    </tr>
                `;
            });
            billContent += `
                            </tbody>
                            <tfoot>
                                <tr class="total-row">
                                    <td colspan="3" style="text-align:right;">Total (₹)</td>
                                    <td class="amount">${bill.total.toFixed(0)}</td>
                                </tr>
                            </tfoot>
                        </table>
                        <div class="thankyou">
                            Thank you for shopping with us!<br>Visit Again <span class="emoji">🙏</span>
                        </div>
                    </div>
                </body>
                </html>
            `;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(billContent);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();

        } catch (error) {
            console.error('Error printing bill:', error);
            showNotification('Error printing bill', 'error');
        }
    }

    async function loadShopSettings() {
        try {
            const response = await fetch(API.settings);
            if (!response.ok) throw new Error('Failed to load settings');
            const settings = await response.json();
            shopSettingsCache = settings;
            if (settings) {
                document.getElementById('shopName').value = settings.shopName || '';
                document.getElementById('address').value = settings.address || '';
                document.getElementById('phone').value = settings.phone || '';
                document.getElementById('email').value = settings.email || '';
                document.getElementById('gstin').value = settings.gstin || '';
            }
            // Load logo from localStorage
            shopLogoDataUrl = localStorage.getItem('shopLogoDataUrl') || '';
        } catch (error) {
            console.error('Error loading shop settings:', error);
        }
    }

    async function saveShopSettings() {
        const settings = {
            shopName: document.getElementById('shopName').value,
            address: document.getElementById('address').value,
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value,
            gstin: document.getElementById('gstin').value,
        };

        try {
            const response = await fetch(API.settings, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            if (!response.ok) throw new Error('Failed to save settings');
            shopSettingsCache = await response.json();
            // Save logo to localStorage if present
            if (logoInput && logoInput.files && logoInput.files[0]) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    shopLogoDataUrl = evt.target.result;
                    localStorage.setItem('shopLogoDataUrl', shopLogoDataUrl);
                };
                reader.readAsDataURL(logoInput.files[0]);
            }
            showNotification('Settings saved successfully!', 'success');
            closeModal('settingsModal');
        } catch (error) {
            console.error('Error saving settings:', error);
            showNotification('Error saving settings', 'error');
        }
    }

    async function createBill() {
        const billItems = document.querySelectorAll('#billItems .bill-item');
        
        if (billItems.length === 0) {
            showNotification('Please add at least one item to the bill', 'error');
            return;
        }

        const items = [];
        billItems.forEach(item => {
            items.push({
                productId: item.dataset.productId,
                quantity: parseInt(item.dataset.quantity),
                price: parseFloat(item.dataset.price)
            });
        });

        try {
            const response = await fetch(API.bills, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to create bill');
            }

            showNotification('Bill created successfully!', 'success');
            loadBills();
            loadSellHistory();
            // Clear the Add Item section and reset the form
            document.getElementById('billItems').innerHTML = '';
            document.getElementById('addBillForm').reset();
            updateBillTotal();
            updateAddItemSectionVisibility();
            // Show Print Bill button
            showPrintBillButton();
        } catch (error) {
            console.error('Error creating bill:', error);
            showNotification(`Error creating bill: ${error.message}`, 'error');
        }
    }

    async function loadProductOptions() {
        try {
            const response = await fetch(API.products);
            productsCache = await response.json();
            const selects = document.querySelectorAll('.product-select-dropdown');
            selects.forEach(select => {
                select.innerHTML = '<option value="">Select a product</option>';
                productsCache.forEach(product => {
                    if (product.stock > 0) {
                        const option = document.createElement('option');
                        option.value = product.id;
                        option.textContent = `${product.name} (Stock: ${product.stock})`;
                        select.appendChild(option);
                    }
                });
            });
        } catch (error) {
            console.error('Error loading product options:', error);
            showNotification('Error loading product options', 'error');
        }
    }

    function searchProduct() {
        const searchTerm = productSearchInput.value.trim().toLowerCase();
        const productSelect = document.getElementById('billProductSelect');
        
        if (!searchTerm) {
            // If search is empty, show all products with stock
            productSelect.innerHTML = '<option value="">Select a product</option>';
            productsCache.forEach(product => {
                if (product.stock > 0) {
                    const option = document.createElement('option');
                    option.value = product.id;
                    option.textContent = `${product.name} (Stock: ${product.stock})`;
                    productSelect.appendChild(option);
                }
            });
            // Always refocus for next scan
            setTimeout(() => { productSearchInput.focus(); }, 50);
            return;
        }

        // Filter products by barcode or name
        const filteredProducts = productsCache.filter(product => {
            const matchesBarcode = product.barcode && product.barcode.toLowerCase().includes(searchTerm);
            const matchesName = product.name.toLowerCase().includes(searchTerm);
            return (matchesBarcode || matchesName) && product.stock > 0;
        });

        // Update the dropdown with filtered results
        productSelect.innerHTML = '<option value="">Select a product</option>';
        filteredProducts.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} (Stock: ${product.stock})`;
            productSelect.appendChild(option);
        });

        if (filteredProducts.length === 0) {
            showNotification('No products found matching your search', 'error');
            // Always refocus for next scan
            setTimeout(() => { productSearchInput.focus(); }, 50);
        } else if (filteredProducts.length === 1) {
            showNotification(`Found product: ${filteredProducts[0].name}`, 'success');
            autoAddOrIncrementBillItem(filteredProducts[0]);
            // Always refocus for next scan
            setTimeout(() => { productSearchInput.focus(); }, 50);
        } else {
            // Multiple matches, just refocus
            setTimeout(() => { productSearchInput.focus(); }, 50);
        }
    }

    // Debounce utility
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Replace direct input event with debounced version
    productSearchInput.removeEventListener && productSearchInput.removeEventListener('input', searchProduct);
    productSearchInput.addEventListener('input', debounce(searchProduct, 150));

    function autoAddOrIncrementBillItem(product) {
        const billItemsContainer = document.getElementById('billItems');
        const existingItems = billItemsContainer.querySelectorAll('.bill-item');
        let found = false;
        for (let item of existingItems) {
            if (item.dataset.productId === product.id) {
                // Always increment the current quantity (even if changed manually)
                let quantity = parseInt(item.dataset.quantity) + 1;
                if (quantity > product.stock) {
                    showNotification(`Insufficient stock. Available: ${product.stock}`, 'error');
                    productSearchInput.value = '';
                    document.getElementById('quantity').value = '1';
                    return;
                }
                item.dataset.quantity = quantity;
                // Update the quantity input in the bill item
                const qtyInput = item.querySelector('.bill-item-qty-input');
                if (qtyInput) qtyInput.value = quantity;
                item.querySelector('.bill-item-price').textContent = `₹${(product.price * quantity).toFixed(2)}`;
                found = true;
                item.style.background = '#fef08a';
                setTimeout(() => {
                    item.style.transition = 'background 0.7s';
                    item.style.background = '';
                }, 700);
                updateBillTotal();
                productSearchInput.value = '';
                document.getElementById('quantity').value = '1';
                return;
            }
        }
        if (!found) {
            // Add new item to bill with editable quantity
            const billItem = document.createElement('div');
            billItem.className = 'bill-item';
            billItem.dataset.productId = product.id;
            billItem.dataset.quantity = 1;
            billItem.dataset.price = product.price;
            billItem.innerHTML = `
                <div class="bill-item-info">
                    <div class="bill-item-name">${product.name}</div>
                    <div class="bill-item-details">
                        Barcode: ${product.barcode || '-'} | Price: ₹${product.price.toFixed(2)}
                    </div>
                    <button type="button" class="btn-remove-item" onclick="removeBillItem(this)">&times;</button>
                </div>
                <input type="number" class="bill-item-qty-input" min="1" max="${product.stock}" value="1" style="width:60px; margin: 0 10px;">
                <div class="bill-item-price">₹${product.price.toFixed(2)}</div>
            `;
            billItemsContainer.appendChild(billItem);
            billItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            billItem.style.background = '#fef08a';
            setTimeout(() => {
                billItem.style.transition = 'background 0.7s';
                billItem.style.background = '';
            }, 700);
            // Add event listener for quantity input
            const qtyInput = billItem.querySelector('.bill-item-qty-input');
            qtyInput.addEventListener('input', function() {
                let newQty = parseInt(this.value) || 1;
                if (newQty < 1) newQty = 1;
                if (newQty > product.stock) {
                    showNotification(`Insufficient stock. Available: ${product.stock}`, 'error');
                    newQty = product.stock;
                }
                billItem.dataset.quantity = newQty;
                this.value = newQty;
                billItem.querySelector('.bill-item-price').textContent = `₹${(product.price * newQty).toFixed(2)}`;
                updateBillTotal();
            });
            updateBillTotal();
            productSearchInput.value = '';
            document.getElementById('quantity').value = '1';
            showNotification(`Added ${product.name} to bill`, 'success');
        }
        // Disable quantity and selling price fields for scanner add
        document.getElementById('quantity').readOnly = true;
        document.getElementById('sellingPrice').readOnly = true;
        document.getElementById('quantity').disabled = true;
        document.getElementById('sellingPrice').disabled = true;
    }

    function addItemToBill() {
        const productSelect = document.getElementById('billProductSelect');
        const productId = productSelect.value;
        const quantity = parseInt(document.getElementById('quantity').value) || 1;
        const sellingPrice = parseFloat(document.getElementById('sellingPrice').value);

        if (!productId || isNaN(quantity) || quantity <= 0 || isNaN(sellingPrice) || sellingPrice <= 0) {
            showNotification('Please select a product and enter valid quantity and price', 'error');
            return;
        }

        const product = productsCache.find(p => p.id === productId);
        if (!product) {
            showNotification('Product not found', 'error');
            return;
        }

        // Check if product is already in the bill
        const existingItems = document.querySelectorAll('#billItems .bill-item');
        for (let item of existingItems) {
            if (item.dataset.productId === productId) {
                showNotification('This product is already in the bill', 'error');
                return;
            }
        }

        // Check stock availability
        if (product.stock < quantity) {
            showNotification(`Insufficient stock. Available: ${product.stock}`, 'error');
            return;
        }

        // Add item to bill
        const billItemsContainer = document.getElementById('billItems');
        const billItem = document.createElement('div');
        billItem.className = 'bill-item';
        billItem.dataset.productId = productId;
        billItem.dataset.quantity = quantity;
        billItem.dataset.price = sellingPrice;

        const totalPrice = sellingPrice * quantity;
        billItem.innerHTML = `
            <div class="bill-item-info">
                <div class="bill-item-name">${product.name}</div>
                <div class="bill-item-details">
                    Barcode: ${product.barcode || '-'} | Qty: ${quantity} | Price: ₹${sellingPrice.toFixed(2)}
                </div>
            </div>
            <div class="bill-item-price">₹${totalPrice.toFixed(2)}</div>
            <button type="button" class="btn-remove-item" onclick="removeBillItem(this)">&times;</button>
        `;

        billItemsContainer.appendChild(billItem);
        updateBillTotal();

        // Scroll to the newly added item and highlight it
        billItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        billItem.style.background = '#fef08a';
        setTimeout(() => {
            billItem.style.transition = 'background 0.7s';
            billItem.style.background = '';
        }, 700);

        // Reset form fields
        productSelect.value = '';
        document.getElementById('quantity').value = '1';
        document.getElementById('sellingPrice').value = '';
        productSearchInput.value = '';

        showNotification(`Added ${product.name} to bill`, 'success');
    }

    function removeBillItem(button) {
        const billItem = button.closest('.bill-item');
        const productName = billItem.querySelector('.bill-item-name').textContent;
        billItem.remove();
        updateBillTotal();
        updateAddItemSectionVisibility();
        showNotification(`Removed ${productName} from bill`, 'info');
    }

    // Show/hide addItemSection based on Create Bill modal and items
    // const addItemSection = document.getElementById('addItemSection'); // This line is removed
    // const addBillModal = document.getElementById('addBillModal'); // This line is removed

    function updateAddItemSectionVisibility() {
        const billItems = document.querySelectorAll('#billItems .bill-item');
        if (addBillModal.style.display === 'block' && billItems.length > 0) {
            addItemSection.style.display = 'flex';
        } else {
            addItemSection.style.display = 'none';
        }
    }

    // Patch openModal and closeModal to update addItemSection
    const originalOpenModal = openModal;
    openModal = function(modalId) {
        originalOpenModal(modalId);
        updateAddItemSectionVisibility();
    };
    const originalCloseModal = closeModal;
    closeModal = function(modalId) {
        originalCloseModal(modalId);
        updateAddItemSectionVisibility();
    };

    // Update visibility and total when adding/removing items
    function updateBillTotal() {
        const billItems = document.querySelectorAll('#billItems .bill-item');
        let total = 0;
        billItems.forEach(item => {
            const price = parseFloat(item.dataset.price);
            const quantity = parseInt(item.dataset.quantity);
            total += price * quantity;
        });
        // Update or create total display in right card
        let totalSection = document.getElementById('billTotalRight');
        if (totalSection) {
            totalSection.textContent = `Total: ₹${total.toFixed(2)}`;
        }
        updateAddItemSectionVisibility();
    }

    async function deleteBill(id) {
        if (confirm('Are you sure you want to delete this bill?')) {
            try {
                const response = await fetch(`${API.bills}/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Failed to delete bill');
                loadBills();
                showNotification('Bill deleted successfully', 'success');
            } catch (error) {
                console.error('Error deleting bill:', error);
                showNotification('Error deleting bill', 'error');
            }
        }
    }
    
    // Sell History Functions
    async function loadSellHistory() {
        try {
            const response = await fetch(API.sellHistory);
            if (!response.ok) throw new Error('Failed to fetch sell history');
            const history = await response.json();
            sellHistoryTable.innerHTML = '';
            if (history.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `<td class="empty-state" colspan="5">No sales recorded yet. Create a bill to start tracking sales.</td>`;
                sellHistoryTable.appendChild(row);
            } else {
                history.forEach(item => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${item.productName}</td>
                        <td>${item.quantity}</td>
                        <td>₹${item.price.toFixed(2)}</td>
                        <td>₹${item.total.toFixed(2)}</td>
                        <td>${new Date(item.soldAt).toLocaleString()}</td>
                    `;
                    sellHistoryTable.appendChild(row);
                });
            }
        } catch (error) {
            console.error('Error loading sell history:', error);
            showNotification('Error loading sell history', 'error');
        }
    }

    // Navigation logic
    function showSection(sectionToShow) {
        [productsSection, billsSection, sellHistorySection].forEach(section => {
            section.style.display = 'none';
        });
        sectionToShow.style.display = 'block';
        navButtons.forEach(btn => btn.classList.remove('active'));
        if (sectionToShow === productsSection) productsNavBtn.classList.add('active');
        if (sectionToShow === billsSection) billsNavBtn.classList.add('active');
        if (sectionToShow === sellHistorySection) sellHistoryNavBtn.classList.add('active');
    }
    
    // Event Listeners
    productsNavBtn.addEventListener('click', () => showSection(productsSection));
    billsNavBtn.addEventListener('click', () => showSection(billsSection));
    sellHistoryNavBtn.addEventListener('click', () => {
        showSection(sellHistorySection);
        loadSellHistory();
    });
    
    addProductBtn.addEventListener('click', () => openModal('addProductModal'));
    createBillBtn.addEventListener('click', () => openModal('addBillModal'));
    
    addProductForm.addEventListener('submit', (e) => {
        e.preventDefault();
        addProduct();
    });

    productsTable.addEventListener('click', (e) => {
        if (e.target.closest('.edit-product-btn')) {
            editProduct(e.target.closest('.edit-product-btn').dataset.id);
        }
    });

    billsTable.addEventListener('click', (e) => {
        if (e.target.closest('.delete-bill-btn')) {
            deleteBill(e.target.closest('.delete-bill-btn').dataset.id);
        }
        if (e.target.closest('.print-bill-btn')) {
            printBill(e.target.closest('.print-bill-btn').dataset.id);
        }
    });

    editProductForm.addEventListener('submit', (e) => {
        e.preventDefault();
        updateProduct(e);
    });

    addBillForm.addEventListener('submit', (e) => {
        e.preventDefault();
        createBill();
    });

    // Search functionality
    searchProductBtn.addEventListener('click', searchProduct);
    
    document.getElementById('billProductSelect').addEventListener('change', () => {
        const productId = document.getElementById('billProductSelect').value;
        const quantity = parseInt(document.getElementById('quantity').value) || 1;
        const sellingPriceInput = document.getElementById('sellingPrice');

        if (productId) {
            const product = productsCache.find(p => p.id === productId);
            if (product) {
                sellingPriceInput.value = (product.price * quantity).toFixed(2);
            }
        } else {
            sellingPriceInput.value = '';
        }
        // Enable quantity and selling price fields for manual add
        document.getElementById('quantity').readOnly = false;
        document.getElementById('sellingPrice').readOnly = false;
        document.getElementById('quantity').disabled = false;
        document.getElementById('sellingPrice').disabled = false;
    });

    document.getElementById('quantity').addEventListener('input', () => {
        const productId = document.getElementById('billProductSelect').value;
        const quantity = parseInt(document.getElementById('quantity').value);
        const sellingPriceInput = document.getElementById('sellingPrice');

        if (productId && quantity > 0) {
            const product = productsCache.find(p => p.id === productId);
            if (product) {
                sellingPriceInput.value = (product.price * quantity).toFixed(2);
            }
        } else {
            sellingPriceInput.value = '';
        }
    });

    settingsBtn.addEventListener('click', () => {
        loadShopSettings();
        openModal('settingsModal');
    });

    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveShopSettings();
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.clear();
            window.location.href = '/login.html';
        });
    }

    function setTheme(dark) {
        if (dark) {
            document.body.classList.add('dark-mode');
            themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
            localStorage.setItem('theme', 'light');
        }
    }

    themeToggleBtn.addEventListener('click', () => {
        setTheme(!document.body.classList.contains('dark-mode'));
    });

    // On load, set theme from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        setTheme(true);
    } else {
        setTheme(false);
    }

    // Remove scanBarcodeBtn, barcodeScannerContainer, barcodeVideo, closeBarcodeScanner, and related event listeners and functions

    // Attach event listener for Add Item button
    addItemToBillBtn.addEventListener('click', addItemToBill);

    // Event delegation for removing bill items
    document.getElementById('billItems').addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove-item')) {
            removeBillItem(e.target);
        }
    });

    // Initial Load
    showSection(productsSection);
    loadProducts();
    loadBills();
    loadProductOptions();
    loadShopSettings();

    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
    }
}); 