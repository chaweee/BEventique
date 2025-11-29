import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EditPackageModal from "./EditPackageModal";
import AddPackageModal from "./AddPackageModal";
import { Button } from "./components/ui/button";
import DesignerSidebar from "./DesignerSidebar";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "./components/ui/alert-dialog";
import "./DesignerPackages.css";
// Use the same sidebar styles as DesignerQueries for consistent spacing
import "./DesignerQueries.css";

export default function DesignerPackages() {
	const navigate = useNavigate();
	const [packages, setPackages] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	// Modal state
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [editPackageId, setEditPackageId] = useState(null);
	const [addModalOpen, setAddModalOpen] = useState(false);

	// Photo lightbox state
	const [lightboxOpen, setLightboxOpen] = useState(false);
	const [lightboxPhoto, setLightboxPhoto] = useState(null);

	const openLightbox = (photoUrl) => {
		setLightboxPhoto(photoUrl);
		setLightboxOpen(true);
	};

	const closeLightbox = () => {
		setLightboxOpen(false);
		setLightboxPhoto(null);
	};

	useEffect(() => {
		// Role check
		const raw = sessionStorage.getItem("user");
		if (!raw) {
			navigate("/login", { replace: true });
			return;
		}
		try {
			const user = JSON.parse(raw);
			const role = (user.role || user.Role || "").toString().toLowerCase();
			if (role !== "designer") {
				navigate("/customer-home", { replace: true });
				return;
			}
		} catch {
			navigate("/login", { replace: true });
			return;
		}

		// fetch packages
		let mounted = true;
		setLoading(true);
		fetch("http://localhost:3001/api/packages/list")
			.then((res) => res.json())
			.then((packages) => {
				if (!mounted) return;
				// Node.js API returns packages array directly, not wrapped in status object
				setPackages(Array.isArray(packages) ? packages : []);
			})
			.catch((err) => {
				console.error("packages fetch error", err);
				setError("Network error");
			})
			.finally(() => {
				if (mounted) setLoading(false);
			});

		return () => { mounted = false; };
	}, [navigate]);

	// helper to refresh packages from server
	const refreshPackages = () => {
		setLoading(true);
		fetch("http://localhost:3001/api/packages/list")
			.then((res) => res.json())
			.then((packages) => {
				setPackages(Array.isArray(packages) ? packages : []);
				setError("");
			})
			.catch((err) => setError("Network error"))
			.finally(() => setLoading(false));
	};

	// Add deletePackage helper
	const deletePackage = async (pkgId) => {
		try {
			const res = await fetch("http://localhost:3001/api/packages/delete", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: pkgId }),
			});
			const json = await res.json();
			if (json.status === "success") {
				refreshPackages();
			} else {
				setError(json.message || "Failed to delete package");
			}
		} catch (err) {
			console.error("delete package error", err);
			setError("Network error while deleting package");
		}
	};

	// render: show list OR editor
	return (
		<div className="dp-root">
			{/* Sidebar copied from DesignerQueries */}
			<DesignerSidebar />

			<main className="dp-main">
				<div className="dp-messenger">
					<div className="dp-content-wrapper">
						<header className="dp-header">
							<div className="dp-header-top">
								<div>
									<h1>Manage Packages</h1>
									<p>View and edit designer packages stored in the database.</p>
								</div>
								<button className="add-package-btn" onClick={() => setAddModalOpen(true)}>
									+ Add Package
								</button>
							</div>
						</header>

						<section className="dp-content">
							{loading ? (
								<div className="dp-loading">Loading packages...</div>
							) : error ? (
								<div className="dp-error">{error}</div>
							) : packages.length === 0 ? (
								<div className="dp-empty">No packages found.</div>
							) : (
								<div className="dp-table-wrap">
									<table className="dp-table">
								<thead>
									<tr>
										<th className="col-name">Package Name</th>
										<th className="col-desc">Description</th>
										<th className="col-photos">Photos</th>
										<th className="col-price">Price</th>
										<th className="col-actions">Actions</th>
									</tr>
								</thead>

								<tbody>
									{packages.map((pkg, idx) => {
										const packageId = pkg.Package_ID || pkg.id;
										const packageName = pkg.Package_Name || pkg.name || pkg.PackageName;
										const description = pkg.Description || pkg.description || "";
										const price = pkg.Package_Amount || pkg.price_from || "";
										const photos = pkg.photos || [];
										
										return (
											<tr key={packageId ?? idx}>
												<td className="cell-name">{packageName}</td>
												<td className="cell-desc">{description}</td>
												<td className="cell-photos">
													{photos.length > 0 ? (
														<div className="photos-wrap">
															{photos.slice(0, 3).map((photo, i) => (
																<img 
																	key={i} 
																	src={photo} 
																	alt={`${packageName} ${i + 1}`}
																	className="photo-thumb clickable"
																	onClick={() => openLightbox(photo)}
																/>
															))}
														</div>
													) : (
														<span className="no-photos">No photos</span>
													)}
												</td>
												<td className="cell-price">{price ? `₱${Number(price).toLocaleString()}` : "—"}</td>
												<td className="cell-actions">
													<div className="actions-wrap">
														<Button variant="default" onClick={() => { setEditPackageId(packageId); setEditModalOpen(true); }}>Edit</Button>
														<AlertDialog>
															<AlertDialogTrigger asChild>
																<Button variant="outline">Delete</Button>
															</AlertDialogTrigger>
															<AlertDialogContent>
																<AlertDialogHeader>
																	<AlertDialogTitle>Delete Package</AlertDialogTitle>
																	<AlertDialogDescription>
																		Are you sure you want to delete "{packageName}"? This action cannot be undone and will permanently remove the package and all associated data.
																	</AlertDialogDescription>
																</AlertDialogHeader>
																<AlertDialogFooter>
																	<AlertDialogCancel>Cancel</AlertDialogCancel>
																	<AlertDialogAction onClick={() => deletePackage(packageId)}>Delete</AlertDialogAction>
																</AlertDialogFooter>
															</AlertDialogContent>
														</AlertDialog>
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
									</table>
								</div>
							)}
						</section>
					</div>
				</div>
			</main>

			{/* Edit Package Modal */}
			<EditPackageModal
				isOpen={editModalOpen}
				packageId={editPackageId}
				onClose={() => { setEditModalOpen(false); setEditPackageId(null); }}
				onSaved={() => { setEditModalOpen(false); setEditPackageId(null); refreshPackages(); }}
			/>

			{/* Add Package Modal */}
			<AddPackageModal
				isOpen={addModalOpen}
				onClose={() => setAddModalOpen(false)}
				onSaved={() => { setAddModalOpen(false); refreshPackages(); }}
			/>

			{/* Photo Lightbox */}
			{lightboxOpen && (
				<div className="lightbox-overlay" onClick={closeLightbox}>
					<button className="lightbox-close" onClick={closeLightbox}>&times;</button>
					<img 
						src={lightboxPhoto} 
						alt="Full size" 
						className="lightbox-image"
						onClick={(e) => e.stopPropagation()}
					/>
				</div>
			)}
		</div>
	);
}
