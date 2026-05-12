# ─── Service Account (least privilege) ──────────────────────────────────────
resource "google_service_account" "xreg_sa" {
  account_id   = "xreg-vm-sa"
  display_name = "X-REG VM Service Account"
  description  = "Least-privilege SA for the X-REG compute instance"
}

# Only grant logging and monitoring — no storage, no compute admin
resource "google_project_iam_member" "xreg_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.xreg_sa.email}"
}

resource "google_project_iam_member" "xreg_metric_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.xreg_sa.email}"
}

# ─── Compute Instance ───────────────────────────────────────────────────────
resource "google_compute_instance" "xreg_vm" {
  name         = "xreg-vm"
  machine_type = var.machine_type
  zone         = var.zone
  description  = "X-REG tool server — Docker Compose (app + Caddy)"

  tags = ["xreg-vm"]

  labels = {
    app         = "xreg"
    environment = var.environment
    managed_by  = "terraform"
  }

  boot_disk {
    initialize_params {
      image = var.os_image
      size  = var.disk_size_gb
      type  = var.disk_type
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.xreg_subnet.id

    access_config {
      nat_ip = google_compute_address.xreg_ip.address
    }
  }

  service_account {
    email  = google_service_account.xreg_sa.email
    scopes = ["logging-write", "monitoring-write"]
  }

  # ── Security hardening ──────────────────────────────────────────────────
  shielded_instance_config {
    enable_secure_boot          = true
    enable_vtpm                 = true
    enable_integrity_monitoring = true
  }

  # Disable legacy metadata endpoint (security best practice)
  metadata = {
    enable-oslogin         = "FALSE"
    block-project-ssh-keys = "TRUE"
    ssh-keys               = "${var.ssh_username}:${file(var.ssh_public_key_path)}"
  }

  # ── Startup Script ─────────────────────────────────────────────────────
  metadata_startup_script = templatefile("${path.module}/startup.sh.tpl", {
    ssh_username      = var.ssh_username
    domain_name       = var.domain_name
    app_image         = var.app_image
    app_internal_port = var.app_internal_port
    app_deploy_dir    = var.app_deploy_dir
  })

  depends_on = [
    google_project_service.compute,
    google_project_service.os_login,
  ]
}