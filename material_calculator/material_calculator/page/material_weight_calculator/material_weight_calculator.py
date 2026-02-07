import frappe

@frappe.whitelist()
def get_material_density(material):
	"""Get density for a specific material"""
	density = frappe.db.get_value('Material Density', material, 'density')
	return density
