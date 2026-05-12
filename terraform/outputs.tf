output "vm_external_ip" {
  description = "Static external IP of the X-REG VM"
  value       = google_compute_address.xreg_ip.address
}

output "app_deploy_dir" {
  description = "Path on the VM where compose and tarball are stored"
  value       = var.app_deploy_dir
}

output "vm_name" {
  description = "Name of the compute instance"
  value       = google_compute_instance.xreg_vm.name
}

output "ssh_command" {
  description = "SSH command to connect to the VM"
  value       = "ssh -i ${replace(var.ssh_public_key_path, ".pub", "")} ${var.ssh_username}@${google_compute_address.xreg_ip.address}"
}

output "application_url" {
  description = "URL to access the tool (HTTPS on port 443)"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "https://${google_compute_address.xreg_ip.address}"
}

output "firewall_allowed_ips" {
  description = "CIDRs allowed to access the VM"
  value       = var.allowed_cidr_blocks
}