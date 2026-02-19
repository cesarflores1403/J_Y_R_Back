import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import "./Footer.css";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark text-white mt-5">
      <Container className="py-4">
        <Row>
          <Col md={4} className="mb-3">
            <h5>J Y R</h5>
            <p>Tu solución de confianza</p>
          </Col>
          <Col md={4} className="mb-3">
            <h5>Enlaces</h5>
            <ul className="list-unstyled">
              <li>
                <a href="#home" className="text-white-50">
                  Inicio
                </a>
              </li>
              <li>
                <a href="#about" className="text-white-50">
                  Acerca de
                </a>
              </li>
              <li>
                <a href="#contact" className="text-white-50">
                  Contacto
                </a>
              </li>
            </ul>
          </Col>
          <Col md={4} className="mb-3">
            <h5>Contacto</h5>
            <p className="text-white-50">
              Email: info@jyr.com
              <br />
              Teléfono: +1 (000) 000-0000
            </p>
          </Col>
        </Row>
        <hr className="bg-white-50" />
        <Row>
          <Col className="text-center">
            <p className="text-white-50">
              &copy; {currentYear} J Y R. Todos los derechos reservados.
            </p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
}

export default Footer;
