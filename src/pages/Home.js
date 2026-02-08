import React from "react";
import { Container, Row, Col, Button, Card } from "react-bootstrap";
import "./Home.css";

function Home() {
  return (
    <Container fluid className="home-container">
      {/* Hero Section */}
      <section className="hero py-5">
        <Container>
          <Row className="align-items-center">
            <Col lg={6} className="text-center text-lg-start mb-4 mb-lg-0">
              <h1 className="display-4 fw-bold mb-4">Bienvenido a J Y R</h1>
              <p className="lead mb-4">
                La solución completa para tu negocio. Moderno, eficiente y
                seguro.
              </p>
              <Button variant="primary" size="lg" className="me-2">
                Comenzar
              </Button>
              <Button variant="outline-primary" size="lg">
                Más información
              </Button>
            </Col>
            <Col lg={6} className="text-center">
              <div className="hero-image">
                <i
                  className="fas fa-rocket"
                  style={{ fontSize: "200px", color: "#0d6efd" }}
                ></i>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Features Section */}
      <section className="features py-5 bg-light">
        <Container>
          <h2 className="text-center mb-5">Características Principales</h2>
          <Row className="g-4">
            <Col md={6} lg={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="text-center">
                  <h5 className="card-title mb-3">
                    <i className="fas fa-code"></i> Moderno
                  </h5>
                  <p className="card-text">
                    Construido con las últimas tecnologías y mejores prácticas.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} lg={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="text-center">
                  <h5 className="card-title mb-3">
                    <i className="fas fa-bolt"></i> Rápido
                  </h5>
                  <p className="card-text">
                    Rendimiento optimizado para la mejor experiencia de usuario.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} lg={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="text-center">
                  <h5 className="card-title mb-3">
                    <i className="fas fa-shield-alt"></i> Seguro
                  </h5>
                  <p className="card-text">
                    Máxima seguridad en todos los aspectos de la aplicación.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Call to Action Section */}
      <section className="cta py-5">
        <Container className="text-center">
          <h2 className="mb-4">¿Listo para comenzar?</h2>
          <p className="lead mb-4">
            Únete a miles de usuarios satisfechos y transforma tu negocio.
          </p>
          <Button variant="success" size="lg">
            Crear cuenta ahora
          </Button>
        </Container>
      </section>
    </Container>
  );
}

export default Home;
