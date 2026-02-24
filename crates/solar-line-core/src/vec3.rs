/// Generic 3D vector for use with unit newtypes.
use std::fmt;
use std::ops::{Add, Neg, Sub};

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Vec3<T> {
    pub x: T,
    pub y: T,
    pub z: T,
}

impl<T: Copy> Vec3<T> {
    pub fn new(x: T, y: T, z: T) -> Self {
        Self { x, y, z }
    }
}

/// Vec3 of f64-newtypes that support the operations we need.
/// We implement common operations generically where the inner type supports them.
impl<T> Add for Vec3<T>
where
    T: Add<Output = T>,
{
    type Output = Self;
    fn add(self, rhs: Self) -> Self {
        Self {
            x: self.x + rhs.x,
            y: self.y + rhs.y,
            z: self.z + rhs.z,
        }
    }
}

impl<T> Sub for Vec3<T>
where
    T: Sub<Output = T>,
{
    type Output = Self;
    fn sub(self, rhs: Self) -> Self {
        Self {
            x: self.x - rhs.x,
            y: self.y - rhs.y,
            z: self.z - rhs.z,
        }
    }
}

impl<T> Neg for Vec3<T>
where
    T: Neg<Output = T>,
{
    type Output = Self;
    fn neg(self) -> Self {
        Self {
            x: -self.x,
            y: -self.y,
            z: -self.z,
        }
    }
}

impl<T> Vec3<T>
where
    T: Copy + std::ops::Mul<f64, Output = T>,
{
    /// Scalar multiplication
    pub fn scale(self, s: f64) -> Self {
        Self {
            x: self.x * s,
            y: self.y * s,
            z: self.z * s,
        }
    }
}

/// Trait for types that wrap an f64 value.
/// All implementors are `Copy`, so consuming `self` is intentional.
#[allow(clippy::wrong_self_convention)]
pub trait AsF64 {
    fn as_f64(self) -> f64;
}

impl AsF64 for f64 {
    fn as_f64(self) -> f64 {
        self
    }
}

impl<T: Copy + AsF64> Vec3<T> {
    /// Dot product returning f64 (in squared units of T).
    pub fn dot_raw(self, rhs: Self) -> f64 {
        self.x.as_f64() * rhs.x.as_f64()
            + self.y.as_f64() * rhs.y.as_f64()
            + self.z.as_f64() * rhs.z.as_f64()
    }

    /// Euclidean norm (magnitude) as f64, in units of T.
    pub fn norm_raw(self) -> f64 {
        self.dot_raw(self).sqrt()
    }

    /// Cross product with same type, returning Vec3<f64> (units are T²).
    pub fn cross_raw(self, rhs: Self) -> Vec3<f64> {
        Vec3 {
            x: self.y.as_f64() * rhs.z.as_f64() - self.z.as_f64() * rhs.y.as_f64(),
            y: self.z.as_f64() * rhs.x.as_f64() - self.x.as_f64() * rhs.z.as_f64(),
            z: self.x.as_f64() * rhs.y.as_f64() - self.y.as_f64() * rhs.x.as_f64(),
        }
    }

    /// Cross product with a different type, returning Vec3<f64> (units are T·U).
    pub fn cross_raw_with<U: Copy + AsF64>(self, rhs: Vec3<U>) -> Vec3<f64> {
        Vec3 {
            x: self.y.as_f64() * rhs.z.as_f64() - self.z.as_f64() * rhs.y.as_f64(),
            y: self.z.as_f64() * rhs.x.as_f64() - self.x.as_f64() * rhs.z.as_f64(),
            z: self.x.as_f64() * rhs.y.as_f64() - self.y.as_f64() * rhs.x.as_f64(),
        }
    }
}

impl Vec3<f64> {
    /// Normalize to unit vector. Returns zero vector if norm is zero.
    pub fn normalize(self) -> Self {
        let n = self.norm_raw();
        if n < 1e-15 {
            Self::new(0.0, 0.0, 0.0)
        } else {
            self.scale(1.0 / n)
        }
    }
}

impl<T: fmt::Display> fmt::Display for Vec3<T> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "({}, {}, {})", self.x, self.y, self.z)
    }
}

// Implement AsF64 for our unit types
use crate::units::{Km, KmPerSec};

impl AsF64 for Km {
    fn as_f64(self) -> f64 {
        self.value()
    }
}

impl AsF64 for KmPerSec {
    fn as_f64(self) -> f64 {
        self.value()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::units::{Km, KmPerSec};

    #[test]
    fn test_vec3_f64_operations() {
        let a = Vec3::new(1.0_f64, 2.0, 3.0);
        let b = Vec3::new(4.0_f64, 5.0, 6.0);
        let sum = a + b;
        assert_eq!(sum, Vec3::new(5.0, 7.0, 9.0));
        let diff = b - a;
        assert_eq!(diff, Vec3::new(3.0, 3.0, 3.0));
    }

    #[test]
    fn test_vec3_km_operations() {
        let a = Vec3::new(Km(1.0), Km(0.0), Km(0.0));
        let b = Vec3::new(Km(0.0), Km(1.0), Km(0.0));
        let sum = a + b;
        assert_eq!(sum, Vec3::new(Km(1.0), Km(1.0), Km(0.0)));
    }

    #[test]
    fn test_vec3_dot_and_norm() {
        let v = Vec3::new(Km(3.0), Km(4.0), Km(0.0));
        assert!((v.norm_raw() - 5.0).abs() < 1e-15);
        assert!((v.dot_raw(v) - 25.0).abs() < 1e-15);
    }

    #[test]
    fn test_vec3_scale() {
        let v = Vec3::new(Km(1.0), Km(2.0), Km(3.0));
        let scaled = v.scale(2.0);
        assert_eq!(scaled, Vec3::new(Km(2.0), Km(4.0), Km(6.0)));
    }

    #[test]
    fn test_vec3_speed_norm() {
        // ISS orbital velocity roughly ~7.66 km/s
        let v = Vec3::new(KmPerSec(7.0), KmPerSec(3.0), KmPerSec(1.0));
        let speed = v.norm_raw();
        let expected = (49.0 + 9.0 + 1.0_f64).sqrt();
        assert!((speed - expected).abs() < 1e-15);
    }

    #[test]
    fn test_vec3_neg() {
        let v = Vec3::new(Km(1.0), Km(-2.0), Km(3.0));
        let neg_v = -v;
        assert_eq!(neg_v, Vec3::new(Km(-1.0), Km(2.0), Km(-3.0)));
    }

    #[test]
    fn test_vec3_cross_product() {
        // x × y = z
        let x = Vec3::new(Km(1.0), Km(0.0), Km(0.0));
        let y = Vec3::new(Km(0.0), Km(1.0), Km(0.0));
        let z = x.cross_raw(y);
        assert!((z.x - 0.0).abs() < 1e-15);
        assert!((z.y - 0.0).abs() < 1e-15);
        assert!((z.z - 1.0).abs() < 1e-15);
    }

    #[test]
    fn test_vec3_cross_product_anticommutative() {
        let a = Vec3::new(Km(1.0), Km(2.0), Km(3.0));
        let b = Vec3::new(Km(4.0), Km(5.0), Km(6.0));
        let ab = a.cross_raw(b);
        let ba = b.cross_raw(a);
        assert!((ab.x + ba.x).abs() < 1e-10);
        assert!((ab.y + ba.y).abs() < 1e-10);
        assert!((ab.z + ba.z).abs() < 1e-10);
    }

    #[test]
    fn test_vec3_normalize() {
        let v = Vec3::new(3.0_f64, 4.0, 0.0);
        let n = v.normalize();
        assert!((n.norm_raw() - 1.0).abs() < 1e-15);
        assert!((n.x - 0.6).abs() < 1e-15);
        assert!((n.y - 0.8).abs() < 1e-15);
    }

    #[test]
    fn test_vec3_normalize_zero() {
        let v = Vec3::new(0.0_f64, 0.0, 0.0);
        let n = v.normalize();
        assert!((n.norm_raw()).abs() < 1e-15);
    }
}
