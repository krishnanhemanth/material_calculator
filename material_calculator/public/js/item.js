frappe.ui.form.on('Item', {
	refresh: function(frm) {
		if (!frm.is_new()) {
			frm.add_custom_button(__('Material Weight Calculator'), function() {
				frappe.msgprint('Material Weight Calculator integration loaded. Open the standalone calculator for now: Ctrl+K > Material Weight Calculator');
			}, __('Tools'));
		}
	}
});
