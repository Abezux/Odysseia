# Mathematical Specification: Selenographic Ephemeris Engine

**Author**: Agent A2 (Ephemeris Engine)  
**Reference System**: IAU Lunar Mean Earth / Polar Axis (ME) Frame  
**Standard**: Pure in-browser execution via `astronomy-engine`  

---

## 1. Reference Frame & Body-Fixed Coordinate System

The ephemeris engine operates within the **Mean Earth / Polar Axis (ME)** frame (IAU/IAG standard for lunar cartography):
- **Origin**: Center of mass of the Moon ($R_{\text{mean}} = 1,737.4\text{ km}$).
- **Z-Axis**: Aligned with the lunar mean rotational axis, pointing towards the North pole.
- **X-Axis**: Lies in the lunar equatorial plane, pointing towards the mean sub-Earth point ($0^\circ\text{ N}, 0^\circ\text{ E}$).
- **Y-Axis**: Completes the right-handed orthogonal system ($Z \times X = Y$, pointing towards $90^\circ\text{ E}$ in Mare Smythii).

*(Note: JPL Horizons can output both Mean Earth/Polar Axis [ME] and Principal Axis [PA] frame vectors. In `docs/VALIDATION.md`, the constant angular offset between the ME and PA frames [$\approx 0.014^\circ$] is documented).*

---

## 2. Topocentric East-North-Up (ENU) Basis & Polar Continuity

At a landing site with selenographic coordinates $(\phi, \lambda)$ (latitude $\phi$, longitude $\lambda$) and elevation $h$:
The site position vector is:
$$\vec{r}_{\text{site}} = (R_{\text{mean}} + h) \begin{pmatrix} \cos\phi \cos\lambda \\ \cos\phi \sin\lambda \\ \sin\phi \end{pmatrix}$$

### Polar Singularity Resolution
At middle and equatorial latitudes ($-89.999^\circ < \phi < +89.999^\circ$), the topocentric basis vectors are:
$$\hat{\text{Up}} = \begin{pmatrix} \cos\phi \cos\lambda \\ \cos\phi \sin\lambda \\ \sin\phi \end{pmatrix}, \quad \hat{\text{North}} = \begin{pmatrix} -\sin\phi \cos\lambda \\ -\sin\phi \sin\lambda \\ \cos\phi \end{pmatrix}, \quad \hat{\text{East}} = \begin{pmatrix} -\sin\lambda \\ \cos\lambda \\ 0 \end{pmatrix}$$

At the exact South Pole ($\phi \le -89.999^\circ$), conventional spherical azimuth ($\text{atan2}(\Delta\text{lon}, \Delta\text{lat})$) fails because all meridians converge. To guarantee smooth, continuous azimuth tracks across $-89.9^\circ \to -90.0^\circ$, **North is defined along the local meridian of the landing site's given longitude**:
$$\hat{\text{Up}} = \begin{pmatrix} 0 \\ 0 \\ -1 \end{pmatrix}, \quad \hat{\text{North}} = \begin{pmatrix} \cos\lambda \\ \sin\lambda \\ 0 \end{pmatrix}, \quad \hat{\text{East}} = \begin{pmatrix} -\sin\lambda \\ \cos\lambda \\ 0 \end{pmatrix}$$

Notice that as $\phi \to -90^\circ$, $-\sin\phi \to 1$, making this definition the continuous mathematical limit of $\hat{\text{North}}$ with zero jump discontinuity.

---

## 3. Topocentric Azimuth, Elevation & Parallax

Given a celestial body $B$ (Sun or Earth) with selenocentric sub-point $(\phi_B, \lambda_B)$ at distance $D_B$:
$$\vec{r}_B = D_B \begin{pmatrix} \cos\phi_B \cos\lambda_B \\ \cos\phi_B \sin\lambda_B \\ \sin\phi_B \end{pmatrix}$$

The topocentric line-of-sight vector from the landing site to body $B$ accounts for lunar topocentric parallax:
$$\vec{\rho} = \vec{r}_B - \vec{r}_{\text{site}}, \quad \hat{u} = \frac{\vec{\rho}}{\|\vec{\rho}\|}$$

Projecting $\hat{u}$ onto the local ENU basis:
$$u_E = \hat{u} \cdot \hat{\text{East}}, \quad u_N = \hat{u} \cdot \hat{\text{North}}, \quad u_U = \hat{u} \cdot \hat{\text{Up}}$$

- **Topocentric Elevation**:
  $$\text{Elevation} = \arcsin(u_U) \in [-90^\circ, +90^\circ]$$
- **Topocentric Azimuth (clockwise from North)**:
  $$\text{Azimuth} = \text{atan2}(u_E, u_N) \pmod{360^\circ} \in [0^\circ, 360^\circ)$$
- **Apparent Angular Diameter**:
  $$\theta_{\text{angular}} = 2 \arcsin\left(\frac{R_{\text{body}}}{\|\vec{\rho}\|}\right)$$
  - Sun: $R_{\text{sun}} = 696,340\text{ km} \implies \theta \approx 0.53^\circ - 0.54^\circ$
  - Earth: $R_{\text{earth}} = 6,371\text{ km} \implies \theta \approx 1.8^\circ - 2.0^\circ$

---

## 4. Optical Libration & Phase Modeling

1. **Sub-Earth Motion (Libration)**:
   The Moon's eccentric orbit and $6.68^\circ$ inclination between its spin axis and orbital plane create optical libration of $\approx \pm 8^\circ$ in longitude and $\approx \pm 6.7^\circ$ in latitude. The sub-Earth point wanders across the lunar nearside, causing the Earth to trace an apparent Lissajous-like loop in the local sky.
2. **Earth Lunar Phase**:
   Viewed from the lunar surface, Earth's illumination phase is complementary to the Moon's phase viewed from Earth:
   $$\text{Phase}_{\text{Earth}} = 1 - \text{Phase}_{\text{Moon}}$$
